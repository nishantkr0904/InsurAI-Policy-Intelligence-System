from pydantic_settings import BaseSettings
from functools import lru_cache

try:
    import litellm
except Exception:  # pragma: no cover - optional import during tooling/bootstrap
    litellm = None


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

    # Embedding model (Phase P4 – T5)
    # LiteLLM model string: "text-embedding-3-small" (OpenAI) or
    # "ollama/nomic-embed-text" (local, no API key needed)
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_API_KEY: str = ""
    LITELLM_API_KEY: str = ""

    # Milvus (Phase P4 – T6)
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    MILVUS_COLLECTION: str = "insurai_chunks"

    # LLM inference (Phase P5 – T7)
    # LiteLLM model string, e.g. "gpt-4o-mini", "ollama/llama3"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.1

    # Cross-encoder re-ranker (Phase P5 – T8)
    # LiteLLM rerank model, e.g. "cohere/rerank-english-v3.0"
    # or "huggingface/BAAI/bge-reranker-v2-m3". Leave empty to skip re-ranking.
    RERANKER_MODEL: str = ""

    # Cookie session authentication
    SESSION_SECRET: str = "dev-only-change-me"
    SESSION_COOKIE_NAME: str = "insurai_session"
    SESSION_COOKIE_MAX_AGE_SECONDS: int = 60 * 60 * 24
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_SAMESITE: str = "lax"
    SESSION_COOKIE_DOMAIN: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

if litellm is not None:
    litellm.api_key = settings.LITELLM_API_KEY or settings.OPENAI_API_KEY or None
