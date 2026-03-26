"""
Script to make a user an admin
Usage: python make_admin.py your-email@example.com
"""
import sys
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine
from app.models.user import User


async def make_admin(email: str):
    """Make a user an admin by email."""
    
    async with AsyncSession(engine) as db:
        # Find user
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False
        
        # Get user details before commit
        user_name = user.full_name
        user_email = user.email
        
        # Update to admin
        user.is_admin = True
        await db.commit()
        
        print(f"✅ User '{user_name}' ({user_email}) is now an admin!")
        print(f"\n🔑 You can now login to the admin dashboard:")
        print(f"   URL: http://localhost:3002")
        print(f"   Email: {user_email}")
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py your-email@example.com")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(make_admin(email))
