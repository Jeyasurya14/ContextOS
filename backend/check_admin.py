import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine
from app.models.user import User

async def check_admin():
    async with AsyncSession(engine) as db:
        result = await db.execute(select(User).where(User.email == 'learnmadeadmin@gmail.in'))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"✓ User found: {user.email}")
            print(f"  Full name: {user.full_name}")
            print(f"  is_admin: {user.is_admin}")
            print(f"  is_active: {user.is_active}")
            print(f"  is_verified: {user.is_verified}")
        else:
            print("✗ User not found")

asyncio.run(check_admin())
