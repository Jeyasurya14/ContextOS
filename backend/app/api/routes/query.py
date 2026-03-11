# backend/app/api/routes/query.py

import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.core.security import hash_api_key
from app.models.user import User
from app.models.conversation import Conversation, ConversationMessage
from app.services.react_agent import react_agent
from app.services.billing_service import billing_service

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    """Schema for query request from VS Code extension or frontend."""
    question: str
    workspace_context: dict | None = None
    stream: bool = True
    conversation_id: str | None = None


async def _get_user_from_api_key(
    db: AsyncSession,
    api_key: str,
) -> User:
    """Resolve user from API key."""
    if not api_key or not api_key.startswith("ctx_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format",
        )
    hashed = hash_api_key(api_key)
    result = await db.execute(select(User).where(User.api_key_hash == hashed))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )
    return user


async def _get_user_from_bearer_or_api_key(
    db: AsyncSession,
    authorization: str = "",
    x_api_key: str = "",
) -> User:
    """Resolve user from Bearer token or X-API-Key header."""
    if x_api_key and x_api_key.startswith("ctx_"):
        return await _get_user_from_api_key(db, x_api_key)

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        from app.core.security import decode_token
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user and user.is_active:
                    return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid Authorization header or X-API-Key required",
    )


@router.post("")
async def query(
    data: QueryRequest,
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(default=""),
    x_api_key: str = Header(alias="X-API-Key", default=""),
) -> StreamingResponse:
    """Process a user query and stream the response via SSE.

    Supports both Bearer token (frontend) and X-API-Key (VS Code extension) auth.

    SSE Events:
        - thinking: {"event": "thinking", "message": str}
        - searching: {"event": "searching", "source": str, "count": int}
        - token: {"event": "token", "content": str}
        - sources: {"event": "sources", "sources": list}
        - done: {"event": "done", "conversation_id": str}
        - error: {"event": "error", "message": str}

    Returns:
        StreamingResponse with text/event-stream content type.
    """
    user = await _get_user_from_bearer_or_api_key(db, authorization, x_api_key)

    if not data.question or not data.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question is required",
        )

    allowed = await billing_service.check_query_limit(user, db)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=billing_service.get_upgrade_message(user),
        )

    await billing_service.increment_query_count(user, db)

    conversation_history: list[dict] = []
    conversation_id = data.conversation_id

    if conversation_id:
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id,
            )
        )
        conversation = conv_result.scalar_one_or_none()
        if conversation:
            for msg in conversation.messages:
                conversation_history.append({
                    "role": msg.role,
                    "content": msg.content,
                })
    else:
        conversation = Conversation(
            id=str(uuid4()),
            user_id=user.id,
            title=data.question[:100],
        )
        db.add(conversation)
        await db.flush()
        conversation_id = conversation.id

    user_msg = ConversationMessage(
        conversation_id=conversation_id,
        role="user",
        content=data.question,
        token_count=len(data.question.split()),
    )
    db.add(user_msg)
    await db.flush()

    async def event_stream():
        """Generate SSE events from the ReAct agent."""
        full_response = ""
        sources_data = []

        async for event in react_agent.stream_response(
            question=data.question,
            user_id=user.id,
            db=db,
            workspace_context=data.workspace_context,
            conversation_history=conversation_history,
            team_id=user.team_id,
        ):
            event_type = event.get("event", "")

            if event_type == "token":
                full_response += event.get("content", "")

            if event_type == "sources":
                sources_data = event.get("sources", [])

            if event_type == "done":
                event["conversation_id"] = conversation_id

            yield f"data: {json.dumps(event)}\n\n"

        try:
            async with async_session_factory() as save_db:
                assistant_msg = ConversationMessage(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response,
                    sources_json=json.dumps(sources_data) if sources_data else None,
                    token_count=len(full_response.split()),
                )
                save_db.add(assistant_msg)

                conv_result = await save_db.execute(
                    select(Conversation).where(Conversation.id == conversation_id)
                )
                conv = conv_result.scalar_one_or_none()
                if conv:
                    conv.message_count = (conv.message_count or 0) + 2

                await save_db.commit()
        except Exception as e:
            logger.error("Failed to save assistant message: {}", type(e).__name__)

    from app.core.database import async_session_factory

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(default=""),
    x_api_key: str = Header(alias="X-API-Key", default=""),
) -> list[dict]:
    """List recent conversations for the authenticated user.

    Returns:
        List of conversation summary dicts.
    """
    user = await _get_user_from_bearer_or_api_key(db, authorization, x_api_key)

    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(50)
    )
    conversations = result.scalars().all()

    return [
        {
            "id": c.id,
            "title": c.title,
            "message_count": c.message_count,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(default=""),
    x_api_key: str = Header(alias="X-API-Key", default=""),
) -> dict:
    """Get a specific conversation with all messages.

    Returns:
        Dict with conversation details and messages.
    """
    user = await _get_user_from_bearer_or_api_key(db, authorization, x_api_key)

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return {
        "id": conversation.id,
        "title": conversation.title,
        "message_count": conversation.message_count,
        "created_at": conversation.created_at.isoformat(),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": json.loads(m.sources_json) if m.sources_json else None,
                "created_at": m.created_at.isoformat(),
            }
            for m in conversation.messages
        ],
    }
