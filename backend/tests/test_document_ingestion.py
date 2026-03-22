"""Tests for document ingestion endpoints (FR001-FR006)."""

from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_upload_document_pdf(client):
    """Test uploading a PDF document."""
    file_content = b"%PDF-1.4\n%Mock PDF content"

    with patch("app.ingestion.router.upload_file") as mock_upload, \
         patch("app.ingestion.router.ingest_document.delay") as mock_ingest:

        # Mock MinIO upload
        mock_upload.return_value = MagicMock(
            object_name="default/test-doc-123.pdf",
            size_bytes=len(file_content),
            content_type="application/pdf"
        )

        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.pdf", BytesIO(file_content), "application/pdf")},
            data={"workspace_id": "workspace-123"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["filename"] == "test.pdf"
        assert data["size_bytes"] == len(file_content)
        assert data["content_type"] == "application/pdf"
        assert data["status"] == "pending"
        assert data["workspace_id"] == "workspace-123"
        assert "document_id" in data

        # Verify Celery task was enqueued
        mock_ingest.assert_called_once()


@pytest.mark.asyncio
async def test_upload_document_docx(client):
    """Test uploading a DOCX document."""
    file_content = b"PK\x03\x04\x14\x00\x06"  # DOCX magic bytes

    with patch("app.ingestion.router.upload_file") as mock_upload, \
         patch("app.ingestion.router.ingest_document.delay") as mock_ingest:

        mock_upload.return_value = MagicMock(
            object_name="default/test-doc-456.docx",
            size_bytes=len(file_content),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.docx", BytesIO(file_content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"workspace_id": "workspace-456"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["filename"] == "test.docx"
        assert "document_id" in data
        mock_ingest.assert_called_once()


@pytest.mark.asyncio
async def test_upload_document_txt(client):
    """Test uploading a TXT document."""
    file_content = b"This is a policy document in plain text."

    with patch("app.ingestion.router.upload_file") as mock_upload, \
         patch("app.ingestion.router.ingest_document.delay") as mock_ingest:

        mock_upload.return_value = MagicMock(
            object_name="default/policy.txt",
            size_bytes=len(file_content),
            content_type="text/plain"
        )

        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("policy.txt", BytesIO(file_content), "text/plain")},
            data={"workspace_id": "workspace-789"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["content_type"] == "text/plain"
        assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_upload_document_unsupported_type(client):
    """Test uploading an unsupported file type."""
    file_content = b"mock image data"

    response = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("image.png", BytesIO(file_content), "image/png")},
        data={"workspace_id": "workspace-123"}
    )

    assert response.status_code == 415  # Unsupported Media Type


@pytest.mark.asyncio
async def test_upload_document_exceeds_size_limit(client):
    """Test uploading a file that exceeds size limit."""
    # Create a file larger than 50 MB
    large_file = BytesIO(b"x" * (51 * 1024 * 1024))

    response = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("large.pdf", large_file, "application/pdf")},
        data={"workspace_id": "workspace-123"}
    )

    assert response.status_code == 413  # Request Entity Too Large


@pytest.mark.asyncio
async def test_upload_document_minio_failure(client):
    """Test handling of MinIO storage failure."""
    file_content = b"%PDF-1.4\nmock pdf"

    with patch("app.ingestion.router.upload_file") as mock_upload:
        mock_upload.side_effect = Exception("MinIO connection failed")

        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.pdf", BytesIO(file_content), "application/pdf")},
            data={"workspace_id": "workspace-123"}
        )

        assert response.status_code == 503  # Service Unavailable


@pytest.mark.asyncio
async def test_list_workspace_documents(client):
    """Test listing documents in a workspace."""
    with patch("app.ingestion.router.list_documents") as mock_list:
        # Mock MinIO list response
        mock_obj1 = MagicMock(
            object_name="default/doc1.pdf",
            size_bytes=1024,
            content_type="application/pdf"
        )
        mock_obj2 = MagicMock(
            object_name="default/doc2.docx",
            size_bytes=2048,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        mock_list.return_value = [mock_obj1, mock_obj2]

        response = await client.get(
            "/api/v1/documents?workspace_id=default"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["filename"] == "doc1.pdf"
        assert data[1]["filename"] == "doc2.docx"


@pytest.mark.asyncio
async def test_list_empty_workspace(client):
    """Test listing documents in an empty workspace."""
    with patch("app.ingestion.router.list_documents") as mock_list:
        mock_list.return_value = []

        response = await client.get(
            "/api/v1/documents?workspace_id=empty-workspace"
        )

        assert response.status_code == 200
        data = response.json()
        assert data == []


@pytest.mark.asyncio
async def test_list_documents_minio_failure(client):
    """Test handling of MinIO failure when listing documents."""
    with patch("app.ingestion.router.list_documents") as mock_list:
        mock_list.side_effect = Exception("MinIO unavailable")

        response = await client.get(
            "/api/v1/documents?workspace_id=default"
        )

        assert response.status_code == 503  # Service Unavailable
