"""
Seed script to populate initial users in the database.
Run this once to create test users including prashant@gmail.com.
"""

import asyncio
import hashlib
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.auth.models import User


def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


async def seed_users():
    """Seed initial users into the database."""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if prashant user already exists
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.email == "prashant@gmail.com")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("✅ User prashant@gmail.com already exists")
        else:
            # Create prashant user
            prashant = User(
                email="prashant@gmail.com",
                password_hash=hash_password("prashant1"),
                name="Prashant",
                role="underwriter",
                workspace="default",
                onboarded=True,
                first_login_shown=False,
            )
            session.add(prashant)
            await session.commit()
            print("✅ Created user: prashant@gmail.com / prashant1")
        
    await engine.dispose()
    print("✅ Database seeding complete")


if __name__ == "__main__":
    asyncio.run(seed_users())
