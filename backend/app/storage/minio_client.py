"""
MinIO object storage client wrapper.

Handles all interactions with the MinIO S3-compatible object store:
- bucket initialization on startup
- file upload returning a structured StoredFile result
- presigned URL generation for secure direct download

Architecture ref: docs/system-architecture.md §11 – Data Storage Strategy
"""

import uuid
from dataclasses import dataclass
from datetime import timedelta
from io import BytesIO

from minio import Minio
from minio.error import S3Error

from app.core.config import settings


@dataclass
class StoredFile:
    object_name: str
    bucket: str
    size_bytes: int
    content_type: str
    etag: str


def _get_client() -> Minio:
    """Return a configured MinIO client instance."""
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )


def ensure_bucket_exists(bucket_name: str) -> None:
    """Create the bucket if it does not already exist."""
    client = _get_client()
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)


def upload_file(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    workspace_id: str,
    bucket: str = settings.MINIO_BUCKET_DOCUMENTS,
) -> StoredFile:
    """
    Upload a file to MinIO.

    Args:
        file_bytes:    Raw file content.
        filename:      Original filename (used to infer extension).
        content_type:  MIME type (e.g. "application/pdf").
        workspace_id:  Logical namespace (maps to a sub-prefix in the bucket).
        bucket:        Target bucket name.

    Returns:
        StoredFile with object name and metadata.
    """
    client = _get_client()
    ensure_bucket_exists(bucket)

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    object_name = f"{workspace_id}/{uuid.uuid4().hex}.{extension}"
    data = BytesIO(file_bytes)
    size = len(file_bytes)

    result = client.put_object(
        bucket_name=bucket,
        object_name=object_name,
        data=data,
        length=size,
        content_type=content_type,
    )

    return StoredFile(
        object_name=object_name,
        bucket=bucket,
        size_bytes=size,
        content_type=content_type,
        etag=result.etag,
    )


def get_presigned_url(
    object_name: str,
    bucket: str = settings.MINIO_BUCKET_DOCUMENTS,
    expiry_minutes: int = 60,
) -> str:
    """
    Generate a time-limited presigned GET URL for a stored object.

    Args:
        object_name:    Full object path in the bucket.
        bucket:         Bucket name.
        expiry_minutes: How long the URL should remain valid.

    Returns:
        Presigned HTTPS URL string.

    Raises:
        S3Error: if the object does not exist or MinIO is unreachable.
    """
    client = _get_client()
    url = client.presigned_get_object(
        bucket_name=bucket,
        object_name=object_name,
        expires=timedelta(minutes=expiry_minutes),
    )
    return url


def list_documents(
    workspace_id: str,
    bucket: str = settings.MINIO_BUCKET_DOCUMENTS,
) -> list[StoredFile]:
    """List all objects stored under a workspace prefix in MinIO."""
    client = _get_client()
    objects = client.list_objects(bucket, prefix=f"{workspace_id}/", recursive=True)
    results = []
    for obj in objects:
        results.append(StoredFile(
            object_name=obj.object_name or "",
            bucket=bucket,
            size_bytes=obj.size or 0,
            content_type="application/octet-stream",
            etag=obj.etag or "",
        ))
    return results


def delete_file(
    object_name: str,
    bucket: str = settings.MINIO_BUCKET_DOCUMENTS,
) -> None:
    """Remove a file from MinIO storage."""
    client = _get_client()
    try:
        client.remove_object(bucket_name=bucket, object_name=object_name)
    except S3Error as exc:
        raise RuntimeError(f"Failed to delete {object_name}: {exc}") from exc
