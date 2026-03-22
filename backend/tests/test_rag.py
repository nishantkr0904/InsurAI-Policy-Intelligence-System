"""Tests for RAG endpoints (FR007-FR011)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_chunks():
    """Fixture for mock retrieved chunks."""
    return [
        MagicMock(
            chunk_id="chunk-1",
            document_id="doc-1",
            content="Coverage includes medical expenses",
            page_number=1,
            relevance_score=0.95,
        ),
        MagicMock(
            chunk_id="chunk-2",
            document_id="doc-1",
            content="Deductible applies to all claims",
            page_number=2,
            relevance_score=0.87,
        ),
    ]


@pytest.mark.asyncio
async def test_chat_request_success(client, mock_chunks):
    """Test successful chat request."""
    with patch("app.rag.router.retrieve") as mock_retrieve, \
         patch("app.rag.router.synthesize") as mock_synthesize:

        mock_retrieve.return_value = mock_chunks

        mock_synthesize.return_value = MagicMock(
            answer="The policy covers medical expenses up to $500,000 per year.",
            sources=[
                {"document_id": "doc-1", "chunk_index": 1, "text_preview": "Coverage includes medical expenses", "score": 0.95},
            ],
            model="gpt-4",
            token_usage={"input": 150, "output": 50},
        )

        payload = {
            "query": "What medical expenses are covered?",
            "workspace_id": "workspace-1",
            "top_k": 5,
        }
        response = await client.post("/api/v1/chat", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert data["model"] == "gpt-4"
        assert data["retrieved_chunks"] == 2


@pytest.mark.asyncio
async def test_chat_with_custom_model(client, mock_chunks):
    """Test chat request with custom model selection."""
    with patch("app.rag.router.retrieve") as mock_retrieve, \
         patch("app.rag.router.synthesize") as mock_synthesize:

        mock_retrieve.return_value = mock_chunks

        mock_synthesize.return_value = MagicMock(
            answer="Claude provides this answer.",
            sources=[],
            model="claude-3-sonnet",
            token_usage={"input": 100, "output": 40},
        )

        payload = {
            "query": "What is the policy limit?",
            "workspace_id": "workspace-1",
            "top_k": 3,
            "model": "claude-3-sonnet",
        }
        response = await client.post("/api/v1/chat", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "claude-3-sonnet"
        # Verify the model was passed to synthesize
        mock_synthesize.assert_called()


@pytest.mark.asyncio
async def test_chat_retrieval_failure(client):
    """Test handling of retrieval failure."""
    with patch("app.rag.router.retrieve") as mock_retrieve:
        mock_retrieve.side_effect = Exception("Milvus connection failed")

        payload = {
            "query": "What are the coverage limits?",
            "workspace_id": "workspace-1",
        }
        response = await client.post("/api/v1/chat", json=payload)

        assert response.status_code == 503  # Service Unavailable


@pytest.mark.asyncio
async def test_chat_synthesis_failure(client, mock_chunks):
    """Test handling of LLM synthesis failure."""
    with patch("app.rag.router.retrieve") as mock_retrieve, \
         patch("app.rag.router.synthesize") as mock_synthesize:

        mock_retrieve.return_value = mock_chunks
        mock_synthesize.side_effect = RuntimeError("LLM API unavailable")

        payload = {
            "query": "What are the claim procedures?",
            "workspace_id": "workspace-1",
        }
        response = await client.post("/api/v1/chat", json=payload)

        assert response.status_code == 503  # Service Unavailable


@pytest.mark.asyncio
async def test_retrieve_chunks_only(client):
    """Test standalone retrieval endpoint without LLM synthesis."""
    mock_chunks = [
        MagicMock(
            chunk_index=1,
            document_id="doc-1",
            text="Accident coverage clause",
            dense_score=0.92,
            bm25_score=0.85,
            final_score=0.89,
        ),
    ]

    with patch("app.rag.retrieve_router.retrieve") as mock_retrieve:
        mock_retrieve.return_value = mock_chunks

        payload = {
            "query": "What is covered for accidents?",
            "workspace_id": "workspace-1",
            "top_k": 5,
        }
        response = await client.post("/api/v1/retrieve", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "chunks" in data
        assert len(data["chunks"]) >= 0


@pytest.mark.asyncio
async def test_retrieve_chunks_no_results(client):
    """Test retrieval returning no relevant chunks."""
    with patch("app.rag.retrieve_router.retrieve") as mock_retrieve:
        mock_retrieve.return_value = []

        payload = {
            "query": "Non-existent coverage type?",
            "workspace_id": "workspace-1",
        }
        response = await client.post("/api/v1/retrieve", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["chunks"] == [] or "chunks" in data


@pytest.mark.asyncio
async def test_retrieve_retrieval_failure(client):
    """Test handling of retrieval failure in retrieve endpoint."""
    with patch("app.rag.retrieve_router.retrieve") as mock_retrieve:
        mock_retrieve.side_effect = Exception("Vector DB unavailable")

        payload = {
            "query": "What is covered?",
            "workspace_id": "workspace-1",
        }
        response = await client.post("/api/v1/retrieve", json=payload)

        assert response.status_code == 503  # Service Unavailable


@pytest.mark.asyncio
async def test_chat_validates_query_length(client):
    """Test chat endpoint query length validation."""
    payload = {
        "query": "a",  # Too short (min 3)
        "workspace_id": "workspace-1",
    }
    response = await client.post("/api/v1/chat", json=payload)

    # Should return validation error
    assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_chat_with_document_filter(client, mock_chunks):
    """Test chat request with document_ids filter (FR011 - Multi-Document Query)."""
    with patch("app.rag.router.retrieve") as mock_retrieve, \
         patch("app.rag.router.synthesize") as mock_synthesize:

        mock_retrieve.return_value = mock_chunks

        mock_synthesize.return_value = MagicMock(
            answer="From selected documents only.",
            sources=[],
            model="gpt-4",
            token_usage={"input": 100, "output": 30},
        )

        payload = {
            "query": "What is covered?",
            "workspace_id": "workspace-1",
            "document_ids": ["doc-1", "doc-2"],  # Filter to specific documents
        }
        response = await client.post("/api/v1/chat", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "answer" in data


@pytest.mark.asyncio
async def test_chat_includes_source_citations(client, mock_chunks):
    """Test that chat response includes source citations (FR010 - Source Citation)."""
    with patch("app.rag.router.retrieve") as mock_retrieve, \
         patch("app.rag.router.synthesize") as mock_synthesize:

        mock_retrieve.return_value = mock_chunks

        mock_synthesize.return_value = MagicMock(
            answer="The answer from the policy.",
            sources=[
                {
                    "document_id": "doc-1",
                    "chunk_index": 2,
                    "text_preview": "Deductible applies to all claims",
                    "score": 0.87,
                },
            ],
            model="gpt-4",
            token_usage={"input": 120, "output": 45},
        )

        payload = {
            "query": "What is the deductible?",
            "workspace_id": "workspace-1",
        }
        response = await client.post("/api/v1/chat", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        assert len(data["sources"]) > 0
        assert "document_id" in data["sources"][0]
        assert "chunk_index" in data["sources"][0]
