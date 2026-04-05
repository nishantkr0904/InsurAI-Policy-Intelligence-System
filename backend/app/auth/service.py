"""
Authentication service with password hashing and user management.
"""

import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import User
from .schemas import UserResponse


# Demo credentials
DEMO_EMAIL = "demo@insurai.ai"
DEMO_PASSWORD = "demo1234"


def hash_password(password: str) -> str:
    """
    Hash password using SHA-256.
    For production, use bcrypt or argon2.
    """
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return hash_password(plain_password) == hashed_password


def get_initials(name: str) -> str:
    """Get user initials from name."""
    return "".join(n[0] for n in name.split()[:2]).upper()


def user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse."""
    return UserResponse(
        name=user.name,
        email=user.email,
        role=user.role,
        workspace=user.workspace,
        initials=get_initials(user.name),
        onboarded=user.onboarded,
        first_login_shown=user.first_login_shown,
    )


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Get user by email."""
    email_normalized = email.strip().lower()
    result = await db.execute(select(User).where(User.email == email_normalized))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession, email: str, password: str, name: str
) -> User:
    """Create new user."""
    email_normalized = email.strip().lower()
    password_hash = hash_password(password)
    
    user = User(
        email=email_normalized,
        password_hash=password_hash,
        name=name,
        onboarded=False,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


async def update_user_onboarding(
    db: AsyncSession, email: str, workspace: str | None, role: str | None
) -> User | None:
    """Update user onboarding status."""
    email_normalized = email.strip().lower()
    user = await get_user_by_email(db, email_normalized)
    
    if not user:
        return None
    
    user.onboarded = True
    if workspace:
        user.workspace = workspace
    if role:
        user.role = role
    
    await db.commit()
    await db.refresh(user)
    
    return user


async def mark_first_login_seen(db: AsyncSession, email: str) -> None:
    """Persist that the first-login message has been displayed."""
    user = await get_user_by_email(db, email)
    if not user:
        return

    user.first_login_shown = True
    await db.commit()


async def validate_login(
    db: AsyncSession, email: str, password: str
) -> tuple[bool, UserResponse | None, str | None]:
    """
    Validate login credentials.
    Returns (success, user, error_message).
    """
    email_normalized = email.strip().lower()
    
    # Check demo credentials
    if email_normalized == DEMO_EMAIL and password == DEMO_PASSWORD:
        demo_user = UserResponse(
            name="Demo User",
            email=DEMO_EMAIL,
            role="admin",
            workspace="default",
            initials="DU",
            onboarded=True,
        )
        return True, demo_user, None
    
    # Check database for registered users
    user = await get_user_by_email(db, email_normalized)
    
    if not user:
        return False, None, "No account found with this email."
    
    if not verify_password(password, user.password_hash):
        return False, None, "Invalid password."
    
    return True, user_to_response(user), None


async def register_user(
    db: AsyncSession, email: str, password: str, name: str
) -> tuple[bool, str | None]:
    """
    Register new user.
    Returns (success, error_message).
    """
    email_normalized = email.strip().lower()
    
    # Check if demo email
    if email_normalized == DEMO_EMAIL:
        return False, "This email is reserved for demo purposes."
    
    # Check if user already exists
    existing_user = await get_user_by_email(db, email_normalized)
    if existing_user:
        return False, "An account with this email already exists."
    
    # Create user
    await create_user(db, email_normalized, password, name)
    
    return True, None
