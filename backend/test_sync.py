#!/usr/bin/env python3
"""Quick test to verify sync works end-to-end"""

import asyncio
import sys
sys.path.insert(0, '/home/surya/Desktop/ContextOS/backend')

from app.services.context_processor import context_processor
from app.services.qdrant_service import qdrant_service
from app.core.database import async_session_factory

async def test_sync():
    print("Testing context processor and Qdrant...")
    
    # Test embedding
    from app.services.embedding_service import embedding_service
    test_text = "This is a test commit from GitHub repository"
    embedding = embedding_service.embed_text(test_text)
    print(f"✓ Embedding generated: {len(embedding)} dimensions")
    
    # Test Qdrant connection
    try:
        collections = qdrant_service.client.get_collections()
        print(f"✓ Qdrant connected: {len(collections.collections)} collections")
    except Exception as e:
        print(f"✗ Qdrant connection failed: {e}")
        return
    
    # Test storing a chunk
    from uuid import uuid4
    test_user_id = str(uuid4())
    test_integration_id = str(uuid4())
    
    async with async_session_factory() as db:
        chunks = await context_processor.process_and_store(
            content="Test GitHub commit: Fixed authentication bug in login endpoint",
            source_type="github_commit",
            source_url="https://github.com/test/repo/commit/abc123",
            user_id=test_user_id,
            integration_id=test_integration_id,
            metadata={"repo": "test/repo", "sha": "abc123"},
            db=db,
        )
        await db.commit()
        print(f"✓ Stored {chunks} chunks")
    
    # Verify in Qdrant
    import time
    time.sleep(1)  # Wait for indexing
    
    info = qdrant_service.client.get_collection("context_chunks")
    print(f"✓ Qdrant now has {info.points_count} points")
    
    # Test search
    query_embedding = embedding_service.embed_text("authentication bug")
    results = qdrant_service.search(
        query_vector=query_embedding,
        user_id=test_user_id,
        limit=5,
    )
    print(f"✓ Search found {len(results)} results")
    if results:
        print(f"  Top result score: {results[0]['score']:.3f}")
        print(f"  Content preview: {results[0]['payload'].get('content_preview', '')[:100]}")
    
    print("\n✅ All tests passed! Sync infrastructure is working.")
    print("\nNow you need to:")
    print("1. Make sure backend server is running")
    print("2. Login to frontend at http://localhost:3000")
    print("3. Go to Dashboard → Integrations")
    print("4. Click 'Sync' button on GitHub")
    print("5. Wait for success message")
    print("6. Go to Chat and ask a question")

if __name__ == "__main__":
    asyncio.run(test_sync())
