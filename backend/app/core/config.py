from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "InsurAI Policy Intelligence System"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_DOCUMENTS: str = "insurai-documents"
    MINIO_SECURE: bool = False

    # PostgreSQL
    DATABASE_URL: str = "postgresql+asyncpg://insurai:insurai@localhost:5432/insurai_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Keycloak
    KEYCLOAK_SERVER_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "insurai"
    KEYCLOAK_CLIENT_ID: str = "insurai-backend"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
