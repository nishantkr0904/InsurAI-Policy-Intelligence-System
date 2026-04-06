"""
Authentication schemas for request/response validation.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class UserRegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str
    name: str


class UserLoginRequest(BaseModel):
    """User login request."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response (without password)."""
    name: str
    email: str
    role: Optional[str] = None
    workspace: Optional[str] = None
    initials: str
    onboarded: bool = False
    first_login_shown: bool = False


class LoginResponse(BaseModel):
    """Login response with user data."""
    success: bool
    user: Optional[UserResponse] = None
    error: Optional[str] = None


class RegisterResponse(BaseModel):
    """Registration response."""
    success: bool
    error: Optional[str] = None


class OnboardingUpdateRequest(BaseModel):
    """Request to update onboarding status."""
    workspace: Optional[str] = None
    role: Optional[str] = None


class UserProfileUpdateRequest(BaseModel):
    """Request to update the authenticated user profile from Settings."""
    name: str
    email: EmailStr
    role: Optional[str] = None
    workspace: Optional[str] = None
