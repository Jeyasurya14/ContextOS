"""
Script to create a new admin user
Usage: python create_admin_user.py "Full Name" email@example.com password
"""
import sys
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine
from app.models.user import User
from app.core.security import hash_password


async def create_admin_user(full_name: str, email: str, password: str):
    """Create a new admin user."""
    
    async with AsyncSession(engine) as db:
        # Check if user already exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"❌ User with email '{email}' already exists")
            print(f"   Use: python make_admin.py {email}")
            return False
        
        # Create new admin user
        hashed_password = hash_password(password)
        new_user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            is_active=True,
            is_verified=True,
            is_admin=True,
            plan="free"
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        print(f"✅ Admin user created successfully!")
        print(f"   Name: {new_user.full_name}")
        print(f"   Email: {new_user.email}")
        print(f"   Admin: {new_user.is_admin}")
        print(f"\n🔑 Login credentials:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"\n🌐 Admin dashboard: http://localhost:3002")
        
        return True


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_admin_user.py \"Full Name\" email@example.com password")
        print("\nExample:")
        print('  python create_admin_user.py "Admin User" admin@example.com MySecurePassword123')
        sys.exit(1)
    
    full_name = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    
    asyncio.run(create_admin_user(full_name, email, password))
