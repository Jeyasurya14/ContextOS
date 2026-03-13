#!/usr/bin/env python3
"""Manually trigger GitHub sync to test and debug"""

import asyncio
import sys
sys.path.insert(0, '/home/surya/Desktop/ContextOS/backend')

from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.integration import Integration
from app.models.user import User
from app.integrations.github import github_integration
from app.core.encryption import decrypt_token
from app.services.context_processor import context_processor
from datetime import datetime, timezone
from loguru import logger

async def manual_sync():
    async with async_session_factory() as db:
        # Get user and integration
        result = await db.execute(
            select(Integration).where(
                Integration.provider == "github",
                Integration.is_active == True
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            print("❌ No active GitHub integration found")
            return
        
        print(f"✓ Found GitHub integration for user {integration.user_id}")
        print(f"  Username: {integration.provider_username}")
        print(f"  Status: {integration.sync_status}")
        
        # Decrypt token
        try:
            access_token = decrypt_token(integration.encrypted_access_token)
            print("✓ Access token decrypted")
        except Exception as e:
            print(f"❌ Failed to decrypt token: {e}")
            return
        
        # Test GitHub API access
        try:
            repos = await github_integration.get_repos(access_token)
            print(f"✓ Fetched {len(repos)} repositories from GitHub")
            
            if not repos:
                print("⚠ No repositories found")
                return
            
            # Show first few repos
            for repo in repos[:5]:
                print(f"  - {repo.get('full_name', 'unknown')}")
        except Exception as e:
            print(f"❌ Failed to fetch repos: {e}")
            return
        
        # Update status
        integration.sync_status = "syncing"
        await db.flush()
        
        total_chunks = 0
        repos_synced = 0
        
        # Sync first 3 repos
        for repo in repos[:3]:
            repo_name = repo.get("full_name", "")
            if not repo_name:
                continue
            
            print(f"\n📦 Syncing repo: {repo_name}")
            
            try:
                # Get commits
                commits = await github_integration.get_commits(access_token, repo_name)
                print(f"  ✓ Found {len(commits)} commits")
                
                if not commits:
                    print("  ⚠ No commits, skipping")
                    continue
                
                # Process first 5 commits
                for i, commit in enumerate(commits[:5], 1):
                    try:
                        commit_text = github_integration.format_commit_as_text(commit, repo_name)
                        
                        if not commit_text or len(commit_text.strip()) < 10:
                            print(f"  ⚠ Commit {i}: Empty/short, skipping")
                            continue
                        
                        print(f"  Processing commit {i}: {commit.get('sha', '')[:7]}...")
                        print(f"    Content length: {len(commit_text)} chars")
                        
                        chunks = await context_processor.process_and_store(
                            content=commit_text,
                            source_type="github_commit",
                            source_url=f"https://github.com/{repo_name}/commit/{commit.get('sha', '')}",
                            user_id=integration.user_id,
                            integration_id=str(integration.id),
                            metadata={
                                "repo": repo_name,
                                "sha": commit.get("sha", ""),
                                "author": commit.get("commit", {}).get("author", {}).get("name", ""),
                            },
                            db=db,
                        )
                        total_chunks += chunks
                        print(f"    ✓ Stored {chunks} chunks")
                        
                    except Exception as commit_err:
                        print(f"    ❌ Failed: {commit_err}")
                        continue
                
                await db.flush()
                repos_synced += 1
                print(f"  ✓ Completed {repo_name}: {total_chunks} total chunks so far")
                
            except Exception as repo_err:
                print(f"  ❌ Failed to sync {repo_name}: {repo_err}")
                continue
        
        # Update integration
        integration.sync_status = "synced"
        integration.total_chunks = total_chunks
        integration.last_synced_at = datetime.now(timezone.utc)
        await db.commit()
        
        print(f"\n✅ Sync completed!")
        print(f"   Repos synced: {repos_synced}")
        print(f"   Total chunks: {total_chunks}")
        print(f"\nNow check Qdrant:")
        print("   curl -s http://localhost:6333/collections/context_chunks | python3 -c \"import sys, json; data = json.load(sys.stdin); print(f'Points: {data[\\\"result\\\"][\\\"points_count\\\"]}')\"")

if __name__ == "__main__":
    asyncio.run(manual_sync())
