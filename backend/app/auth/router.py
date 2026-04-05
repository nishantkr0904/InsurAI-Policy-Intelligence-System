"""Authentication API router."""

from fastapi import APIRouter, Depends, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..database import get_db
from .schemas import (
    UserLoginRequest,
    UserRegisterRequest,
    LoginResponse,
    RegisterResponse,
    OnboardingUpdateRequest,
    UserResponse,
)
from .service import (
    validate_login,
    register_user as register_user_service,
    update_user_onboarding,
    get_user_by_email,
    user_to_response,
    mark_first_login_seen,
)
from .session import create_session_token, get_email_from_session_token


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user with email and password.
    
    Validates credentials against the database and returns user data.
    Also supports demo user (demo@insurai.ai / demo1234).
    """
    success, user, error = await validate_login(db, request.email, request.password)

    if success and user:
        token = create_session_token(user.email)
        response.set_cookie(
            key=settings.SESSION_COOKIE_NAME,
            value=token,
            max_age=settings.SESSION_COOKIE_MAX_AGE_SECONDS,
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite=settings.SESSION_COOKIE_SAMESITE,
            domain=settings.SESSION_COOKIE_DOMAIN,
            path="/",
        )
    
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
    
    return user_to_response(user)


@router.get("/me", response_model=LoginResponse)
async def me(
    db: AsyncSession = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
):
    """Return the authenticated user from secure session cookie."""
    email = get_email_from_session_token(session_cookie)
    if not email:
        return LoginResponse(success=False, user=None, error="Not authenticated")

    user = await get_user_by_email(db, email)
    if not user:
        return LoginResponse(success=False, user=None, error="User not found")

    return LoginResponse(success=True, user=user_to_response(user), error=None)


@router.post("/logout")
async def logout(response: Response):
    """Clear secure session cookie."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        domain=settings.SESSION_COOKIE_DOMAIN,
        path="/",
    )
    return {"success": True}


@router.post("/first-login/ack")
async def acknowledge_first_login(
    db: AsyncSession = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
):
    """Persist that the post-onboarding welcome message has been shown."""
    email = get_email_from_session_token(session_cookie)
    if not email:
        return {"success": False}

    await mark_first_login_seen(db, email)
    return {"success": True}
