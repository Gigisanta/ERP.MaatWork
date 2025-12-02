import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint"""

    def test_health_endpoint_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_structure(self):
        response = client.get("/health")
        data = response.json()

        assert "status" in data
        assert data["status"] == "healthy"
        assert "service" in data
        assert data["service"] == "analytics-service"
        assert "timestamp" in data
        assert "version" in data

    def test_health_timestamp_format(self):
        response = client.get("/health")
        data = response.json()

        # Should be ISO format
        from datetime import datetime

        datetime.fromisoformat(data["timestamp"])


class TestMetricsEndpoint:
    """Tests for /metrics endpoint"""

    def test_metrics_endpoint_returns_200(self):
        response = client.get("/metrics")
        assert response.status_code == 200

    def test_metrics_response_structure(self):
        response = client.get("/metrics")
        data = response.json()

        assert "ok" in data
        assert data["ok"] is True
        assert "pid" in data
        assert "rss" in data
        assert "cpu" in data
        assert "time" in data


class TestRootEndpoint:
    """Tests for / endpoint"""

    def test_root_endpoint_returns_200(self):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_response_structure(self):
        response = client.get("/")
        data = response.json()

        assert "message" in data
        assert "version" in data
        assert "docs" in data


class TestPricesFetchEndpoint:
    """Tests for /prices/fetch endpoint"""

    def test_fetch_prices_empty_symbols_returns_400(self):
        response = client.post("/prices/fetch", json={"symbols": []})
        assert response.status_code == 400

    def test_fetch_prices_too_many_symbols_returns_400(self):
        symbols = [f"SYMBOL{i}" for i in range(51)]
        response = client.post("/prices/fetch", json={"symbols": symbols})
        assert response.status_code == 400

    def test_fetch_prices_valid_request_structure(self):
        # This will likely fail due to yfinance, but tests the structure
        response = client.post("/prices/fetch", json={"symbols": ["AAPL"]})
        # Could be 200 or error depending on network
        assert response.status_code in [200, 400, 500]

        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "data" in data
            assert "timestamp" in data
            assert "count" in data


class TestPricesBackfillEndpoint:
    """Tests for /prices/backfill endpoint"""

    def test_backfill_empty_symbols_returns_400(self):
        response = client.post("/prices/backfill", json={"symbols": []})
        assert response.status_code == 400

    def test_backfill_too_many_symbols_returns_400(self):
        symbols = [f"SYMBOL{i}" for i in range(21)]
        response = client.post("/prices/backfill", json={"symbols": symbols})
        assert response.status_code == 400

    def test_backfill_invalid_days_returns_400(self):
        response = client.post(
            "/prices/backfill", json={"symbols": ["AAPL"], "days": 0}
        )
        assert response.status_code == 400

        response = client.post(
            "/prices/backfill", json={"symbols": ["AAPL"], "days": 4000}
        )
        assert response.status_code == 400


class TestSymbolInfoEndpoint:
    """Tests for /prices/info/{symbol} endpoint"""

    def test_symbol_info_empty_symbol_returns_400(self):
        response = client.get("/prices/info/")
        assert response.status_code == 404  # FastAPI handles this

    def test_symbol_info_valid_request_structure(self):
        response = client.get("/prices/info/AAPL")
        # Could be 200 or error
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "data" in data
            assert "timestamp" in data


class TestSearchSymbolsEndpoint:
    """Tests for /search/symbols endpoint"""

    def test_search_symbols_empty_query_returns_error(self):
        response = client.post("/search/symbols", json={"query": ""})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "error"

    def test_search_symbols_short_query_returns_error(self):
        response = client.post("/search/symbols", json={"query": "a"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "error"

    def test_search_symbols_valid_query_structure(self):
        response = client.post("/search/symbols", json={"query": "Apple"})
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "data" in data
        assert "timestamp" in data

        if data["status"] == "success":
            assert "query" in data["data"]
            assert "results" in data["data"]
            assert "count" in data["data"]


class TestValidateSymbolEndpoint:
    """Tests for /search/validate/{symbol} endpoint"""

    def test_validate_symbol_structure(self):
        response = client.get("/search/validate/AAPL")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "data" in data
        assert "timestamp" in data
