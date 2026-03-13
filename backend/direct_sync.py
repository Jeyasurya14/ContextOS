#!/usr/bin/env python3
"""Direct sync without authentication - for testing only"""

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

async def direct_sync():
    async with async_session_factory() as db:
        # Get the specific integration
        result = await db.execute(
            select(Integration).where(
                Integration.id == '76a708db-87bb-4a56-8cc2-97cf87d958f1'
            )
        )
        integration = result.scalar_one()
        
        print(f"Syncing GitHub for user: {integration.user_id}")
        print(f"Username: {integration.provider_username}")
        
        integration.sync_status = "syncing"
        await db.flush()
        
        access_token = decrypt_token(integration.encrypted_access_token)
        repos = await github_integration.get_repos(access_token)
        print(f"Found {len(repos)} repos")
        
        total_chunks = 0
        
        for repo in repos[:3]:
            repo_name = repo.get("full_name", "")
            if not repo_name:
                continue
            
            print(f"\nSyncing: {repo_name}")
            
            try:
                commits = await github_integration.get_commits(access_token, repo_name)
                print(f"  {len(commits)} commits found")
                
                for commit in commits[:5]:
                    commit_text = github_integration.format_commit_as_text(commit, repo_name)
                    if len(commit_text.strip()) < 10:
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
                        },
                        db=db,
                    )
                    total_chunks += chunks
                    print(f"  Commit {commit.get('sha', '')[:7]}: {chunks} chunks")
                
            except Exception as e:
                print(f"  Error: {e}")
                continue
        
        integration.sync_status = "synced"
        integration.total_chunks = total_chunks
        integration.last_synced_at = datetime.now(timezone.utc)
        await db.commit()
        
        print(f"\n✅ Done! Total chunks: {total_chunks}")

if __name__ == "__main__":
    asyncio.run(direct_sync())
