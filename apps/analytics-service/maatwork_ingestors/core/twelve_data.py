"""
Twelve Data fetcher for market data
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# Twelve Data rate limit: 800 calls per day (free tier)
TWELVE_DATA_RATE_LIMITER = RateLimiter(max_calls=800, period=86400.0)


def fetch_time_series(
    symbol: str,
    api_key: str,
    interval: str = "1day",
    outputsize: int = 30,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch time series data

    Args:
        symbol: Stock symbol
        api_key: Twelve Data API key
        interval: 1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month
        outputsize: Number of data points (default 30)
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        Time series data
    """
    TWELVE_DATA_RATE_LIMITER.wait_if_needed("twelve_data")

    url = "https://api.twelvedata.com/time_series"
    params = {
        "symbol": symbol,
        "interval": interval,
        "apikey": api_key,
        "outputsize": outputsize,
    }

    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date

    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()

    return response.json()


def normalize_twelve_data(data: Dict[str, Any], symbol: str) -> List[Dict[str, Any]]:
    """
    Normalize Twelve Data response to canonical format

    Args:
        data: Twelve Data API response
        symbol: Stock symbol

    Returns:
        List of normalized OHLCV records
    """
    normalized = []

    values = data.get("values", [])

    for value in values:
        try:
            # Twelve Data returns data in reverse chronological order
            normalized.append(
                {
                    "date": value.get("datetime"),
                    "open": float(value.get("open", 0)),
                    "high": float(value.get("high", 0)),
                    "low": float(value.get("low", 0)),
                    "close": float(value.get("close", 0)),
                    "volume": float(value.get("volume", 0)),
                    "currency": "USD",  # Twelve Data defaults to USD
                    "source": "twelve_data",
                }
            )
        except (ValueError, KeyError, TypeError):
            continue

    # Reverse to chronological order
    return list(reversed(normalized))
