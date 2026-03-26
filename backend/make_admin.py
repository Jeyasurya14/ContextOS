"""
Script to make a user an admin
Usage: python make_admin.py your-email@example.com
"""
import sys
import asyncio
from sqlalchemy import select, update
from app.core.database import get_db, engine
from app.models.user import User


async def make_admin(email: str):
    """Make a user an admin by email."""
    from sqlalchemy.ext.asyncio import AsyncSession
    
    async with AsyncSession(engine) as db:
        # Find user
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False
        
        # Update to admin
        user.is_admin = True
        await db.commit()
        
        print(f"✅ User '{user.full_name}' ({email}) is now an admin!")
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py your-email@example.com")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(make_admin(email))
