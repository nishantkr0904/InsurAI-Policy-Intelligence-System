"""
Authentication API router.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from .schemas import (
    UserLoginRequest,
    UserRegisterRequest,
    LoginResponse,
    RegisterResponse,
    OnboardingUpdateRequest,
    UserResponse,
)
from .service import validate_login, register_user as register_user_service, update_user_onboarding


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user with email and password.
    
    Validates credentials against the database and returns user data.
    Also supports demo user (demo@insurai.ai / demo1234).
    """
    success, user, error = await validate_login(db, request.email, request.password)
    
    return LoginResponse(
        success=success,
        user=user,
        error=error,
    )


@router.post("/register", response_model=RegisterResponse)
async def register(
    request: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.
    
    Creates a new user in the database with hashed password.
    Users will need to complete onboarding after registration.
    """
    success, error = await register_user_service(
        db, request.email, request.password, request.name
    )
    
    return RegisterResponse(
        success=success,
        error=error,
    )


@router.post("/onboarding/{email}", response_model=UserResponse)
async def complete_onboarding(
    email: str,
    request: OnboardingUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Mark user onboarding as complete.
    
    Updates user's workspace and role after onboarding flow.
    """
    user = await update_user_onboarding(
        db, email, request.workspace, request.role
    )
    
    if not user:
        return UserResponse(
            name="",
            email=email,
            initials="",
            onboarded=False,
        )
    
    from .service import user_to_response
    return user_to_response(user)
