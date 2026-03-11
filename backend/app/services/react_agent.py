# backend/app/services/react_agent.py

import json
from collections.abc import AsyncGenerator

import anthropic
from loguru import logger

from app.core.config import settings
from app.services.context_retriever import context_retriever
from app.services.context_assembler import context_assembler
from app.services.intent_classifier import intent_classifier


class ReactAgent:
    """ReAct-style agent that retrieves context and streams answers via Claude."""

    SYSTEM_PROMPT = (
        "You are ContextOS, an AI assistant that helps developers by answering questions "
        "using their actual project context from GitHub, Notion, Slack, and their VS Code workspace.\n\n"
        "Rules:\n"
        "- Answer based on the provided context. If the context doesn't contain enough info, say so.\n"
        "- Cite specific sources when referencing information (file paths, commit SHAs, page titles, etc).\n"
        "- Be concise and direct. Developers value clarity over verbosity.\n"
        "- For code questions, provide code snippets when helpful.\n"
        "- If the question is about recent changes, focus on the most recent context.\n"
        "- Never fabricate information. If you don't know, say so.\n"
    )

    def __init__(self) -> None:
        """Initialize the ReAct agent with Anthropic client."""
        self._client: anthropic.AsyncAnthropic | None = None

    @property
    def client(self) -> anthropic.AsyncAnthropic:
        """Lazy-initialize the Anthropic client."""
        if self._client is None:
            self._client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
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

            messages = self._build_messages(
                question=question,
                context=assembled_context,
                conversation_history=conversation_history,
            )

            yield {"event": "thinking", "message": "Generating answer..."}

            if not settings.ANTHROPIC_API_KEY:
                yield {
                    "event": "token",
                    "content": "I found relevant context but the Anthropic API key is not configured. "
                    "Please set ANTHROPIC_API_KEY in your environment to enable AI responses.\n\n"
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
                async with self.client.messages.stream(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=self.SYSTEM_PROMPT,
                    messages=messages,
                ) as stream:
                    async for text in stream.text_stream:
                        yield {"event": "token", "content": text}

            if sources:
                yield {"event": "sources", "sources": sources}

            yield {"event": "done", "conversation_id": ""}

        except anthropic.APIError as e:
            logger.error("Anthropic API error: {}", str(e))
            yield {"event": "error", "message": "AI service temporarily unavailable. Please try again."}
        except Exception as e:
            logger.error("ReAct agent error: {}", type(e).__name__)
            yield {"event": "error", "message": "Something went wrong. Please try again."}

    def _build_messages(
        self,
        question: str,
        context: str,
        conversation_history: list[dict] | None = None,
    ) -> list[dict]:
        """Build the message list for the Anthropic API.

        Args:
            question: The current user question.
            context: The assembled context string.
            conversation_history: Optional previous messages.

        Returns:
            List of message dicts for the Anthropic API.
        """
        messages: list[dict] = []

        if conversation_history:
            for msg in conversation_history[-10:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        user_message = (
            f"## Context\n\n{context}\n\n"
            f"## Question\n\n{question}"
        )
        messages.append({"role": "user", "content": user_message})

        return messages


react_agent = ReactAgent()
