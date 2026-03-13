# backend/app/services/react_agent.py

import json
from collections.abc import AsyncGenerator
from typing import TypedDict

from openai import AsyncOpenAI, OpenAIError
from loguru import logger
from sqlalchemy import select

from app.core.config import settings
from app.services.context_retriever import context_retriever
from app.services.context_assembler import context_assembler
from app.services.intent_classifier import intent_classifier
from app.models.user import User


class AgentState(TypedDict):
    """State for the agent workflow."""
    question: str
    user_id: str
    user_name: str
    retrieval: dict
    context_string: str
    answer: str
    skip_llm: bool
    sources: list


class ReactAgent:
    """ReAct-style agent that retrieves context and streams answers via OpenAI."""

    SYSTEM_PROMPT = """You are ContextOS AI — a project-aware assistant with access to
{user_name}'s actual project data including their GitHub commits, Notion documents,
Slack messages, and VS Code files.

YOUR ONLY JOB:
Answer questions about {user_name}'s project using the context provided below.

WHAT YOU CAN ANSWER:
- Questions about their code, commits, pull requests, issues
- Questions about their Notion documents and decisions
- Questions about their Slack conversations
- Questions about their VS Code files
- Questions about what they worked on, when, and why
- Debugging help using their actual code files
- Explaining decisions found in their project documents

WHAT YOU MUST REFUSE:
- General programming tutorials ("how do I use React hooks?")
- Questions unrelated to their project ("what is machine learning?")
- Questions about other people's projects
- General knowledge questions ("who invented Python?")
- Anything not directly answerable from the context below

HOW TO REFUSE:
If the question is outside your scope, respond exactly like this:
"I can only answer questions about your project. I don't see anything in your
GitHub, Notion, Slack, or VS Code files related to this. Try asking about
your commits, documents, or code files."

HOW TO ANSWER:
- Always cite the exact source (commit hash, document name, file name, channel name)
- Be specific — use real names, dates, and values from the context
- Never make up information not present in the context
- If context is insufficient, say: "I found some related context but not enough
  to answer confidently. The closest I found was [source]. Can you be more specific?"

PROJECT CONTEXT:
{context_string}"""

    def __init__(self) -> None:
        """Initialize the ReAct agent with OpenAI client."""
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        """Lazy-initialize the OpenAI client."""
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def stream_response(
        self,
        question: str,
        user_id: str,
        db: "AsyncSession",
        workspace_context: dict | None = None,
        conversation_history: list[dict] | None = None,
        team_id: str | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Stream a response to a user question using retrieved context.

        Yields SSE-compatible event dicts:
            {"event": "thinking", "message": str}
            {"event": "searching", "source": str, "count": int}
            {"event": "token", "content": str}
            {"event": "sources", "sources": list}
            {"event": "done", "conversation_id": str}
            {"event": "error", "message": str}

        Args:
            question: The user's question.
            user_id: The authenticated user's ID.
            db: Active async database session.
            workspace_context: Optional VS Code workspace context.
            conversation_history: Optional previous messages for context.

        Yields:
            Event dicts for SSE streaming.
        """
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            user_name = user.full_name if user else "User"

            yield {"event": "thinking", "message": "Analyzing your question..."}

            classification = intent_classifier.classify(question)
            source_types = classification.get("sources", [])

            yield {"event": "thinking", "message": "Searching your context..."}

            retrieved_chunks = await context_retriever.retrieve(
                query=question,
                user_id=user_id,
                db=db,
                source_types=source_types,
            )

            if team_id:
                try:
                    from app.services.team_context_service import team_context_service
                    team_chunks = await team_context_service.get_team_chunks(
                        team_id=team_id, db=db, source_types=source_types, limit=20,
                    )
                    existing_ids = {c.get("id") for c in retrieved_chunks}
                    for tc in team_chunks:
                        chunk_dict = {
                            "id": tc.id,
                            "content": tc.content,
                            "source_type": tc.source_type,
                            "source_url": tc.source_url,
                            "user_id": tc.user_id,
                        }
                        if tc.id not in existing_ids:
                            retrieved_chunks.append(chunk_dict)
                except Exception as e:
                    logger.warning("Team context retrieval failed: {}", type(e).__name__)

            source_counts: dict[str, int] = {}
            for chunk in retrieved_chunks:
                src = chunk.get("source_type", "unknown")
                base_src = src.split("_")[0] if "_" in src else src
                source_counts[base_src] = source_counts.get(base_src, 0) + 1

            for source, count in source_counts.items():
                yield {"event": "searching", "source": source, "count": count}

            assembled_context = context_assembler.assemble(
                retrieved_chunks=retrieved_chunks,
                workspace_context=workspace_context,
            )

            sources = context_assembler.extract_sources(retrieved_chunks)

            if not retrieved_chunks or len(retrieved_chunks) < 1:
                yield {
                    "event": "token",
                    "content": (
                        "I don't have enough context from your project to answer this. "
                        "Make sure you have connected GitHub, Notion, or Slack and they have finished syncing. "
                        "Go to Dashboard → Integrations to check your sync status."
                    ),
                }
                yield {"event": "done", "conversation_id": ""}
                return

            # Remove strict relevance filtering - let the LLM decide if context is useful
            # Even low-scoring results can provide helpful context

            messages = self._build_messages(
                question=question,
                context=assembled_context,
                conversation_history=conversation_history,
                user_name=user_name,
            )

            yield {"event": "thinking", "message": "Generating answer..."}

            if not settings.OPENAI_API_KEY:
                yield {
                    "event": "token",
                    "content": "I found relevant context but the OpenAI API key is not configured. "
                    "Please set OPENAI_API_KEY in your environment to enable AI responses.\n\n"
                    "Here's what I found in your context:\n\n"
                }
                for chunk in retrieved_chunks[:5]:
                    preview = chunk.get("content", "")[:200]
                    source_url = chunk.get("source_url", "")
                    yield {
                        "event": "token",
                        "content": f"- **{chunk.get('source_type', '')}**: {source_url}\n  {preview}...\n\n",
                    }
            else:
                stream = await self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=messages,
                    stream=True,
                    max_tokens=2048,
                )
                async for chunk in stream:
                    token = chunk.choices[0].delta.content
                    if token:
                        yield {"event": "token", "content": token}

            if sources:
                yield {"event": "sources", "sources": sources}

            yield {"event": "done", "conversation_id": ""}

        except OpenAIError as e:
            logger.error("OpenAI API error: {}", str(e))
            yield {"event": "error", "message": "AI service temporarily unavailable. Please try again."}
        except Exception as e:
            logger.error("ReAct agent error: {}", type(e).__name__)
            yield {"event": "error", "message": "Something went wrong. Please try again."}

    def _build_messages(
        self,
        question: str,
        context: str,
        conversation_history: list[dict] | None = None,
        user_name: str = "User",
    ) -> list[dict]:
        """Build the message list for the OpenAI API.

        Args:
            question: The current user question.
            context: The assembled context string.
            conversation_history: Optional previous messages.
            user_name: The user's full name.

        Returns:
            List of message dicts for the OpenAI API.
        """
        messages: list[dict] = []

        if conversation_history:
            for msg in conversation_history[-10:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        system_prompt = self.SYSTEM_PROMPT.format(
            user_name=user_name,
            context_string=context,
        )
        messages.insert(0, {"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": question})

        return messages


react_agent = ReactAgent()
