#!/usr/bin/env python3
"""Force a full GitHub sync with more commits"""

import asyncio
import sys
sys.path.insert(0, '/home/surya/Desktop/ContextOS/backend')

from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.integration import Integration
from app.integrations.github import github_integration
from app.core.encryption import decrypt_token
from app.services.context_processor import context_processor
from datetime import datetime, timezone

async def force_sync():
    async with async_session_factory() as db:
        # Get the integration for surya@gmail.com
        result = await db.execute(
            select(Integration).where(
                Integration.provider == "github",
                Integration.user_id == "033c4170-6948-4f6a-914f-c32247b4cef1"
            )
        )
        integration = result.scalar_one()
        
        print(f"Starting sync for {integration.provider_username}")
        integration.sync_status = "syncing"
        await db.flush()
        
        access_token = decrypt_token(integration.encrypted_access_token)
        repos = await github_integration.get_repos(access_token)
        print(f"Found {len(repos)} repositories")
        
        total_chunks = 0
        repos_synced = 0
        
        # Sync first 5 repos, 10 commits each
        for repo in repos[:5]:
            repo_name = repo.get("full_name", "")
            if not repo_name:
                continue
            
            print(f"\n📦 {repo_name}")
            
            try:
                commits = await github_integration.get_commits(access_token, repo_name)
                print(f"  Found {len(commits)} commits")
                
                if not commits:
                    continue
                
                # Process up to 10 commits per repo
                for i, commit in enumerate(commits[:10], 1):
                    try:
                        commit_text = github_integration.format_commit_as_text(commit, repo_name)
                        
                        if not commit_text or len(commit_text.strip()) < 10:
                            continue
                        
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
                        print(f"  ✓ Commit {i}: {chunks} chunks (total: {total_chunks})")
                        
                    except Exception as e:
                        print(f"  ✗ Commit {i} failed: {e}")
                        continue
                
                await db.flush()
                repos_synced += 1
                
            except Exception as e:
                print(f"  ✗ Repo failed: {e}")
                continue
        
        integration.sync_status = "synced"
        integration.total_chunks = total_chunks
        integration.last_synced_at = datetime.now(timezone.utc)
        await db.commit()
        
        print(f"\n✅ Sync complete!")
        print(f"   Repos: {repos_synced}")
        print(f"   Chunks: {total_chunks}")

if __name__ == "__main__":
    asyncio.run(force_sync())
