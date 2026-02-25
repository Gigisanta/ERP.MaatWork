"""
Alpha Vantage fetcher for intraday and EOD data
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import requests

from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# Alpha Vantage rate limit: 5 calls per minute (free tier)
ALPHA_VANTAGE_RATE_LIMITER = RateLimiter(max_calls=5, period=60.0)


def fetch_time_series_daily_adjusted(
    symbol: str, api_key: str, outputsize: str = "compact"
) -> Dict[str, Any]:
    """
    Fetch daily adjusted time series

    Args:
        symbol: Stock symbol
        api_key: Alpha Vantage API key
        outputsize: "compact" (100 data points) or "full" (20+ years)

    Returns:
        Dict with time series data
    """
    ALPHA_VANTAGE_RATE_LIMITER.wait_if_needed("alpha_vantage")

    url = "https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_DAILY_ADJUSTED",
        "symbol": symbol,
        "apikey": api_key,
        "outputsize": outputsize,
        "datatype": "json",
    }

    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()

    return response.json()


def fetch_intraday(
    symbol: str, api_key: str, interval: str = "5min", outputsize: str = "compact"
) -> Dict[str, Any]:
    """
    Fetch intraday time series

    Args:
        symbol: Stock symbol
        api_key: Alpha Vantage API key
        interval: 1min, 5min, 15min, 30min, 60min
        outputsize: "compact" or "full"

    Returns:
        Dict with intraday time series data
    """
    ALPHA_VANTAGE_RATE_LIMITER.wait_if_needed("alpha_vantage")

    url = "https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_INTRADAY",
        "symbol": symbol,
        "interval": interval,
        "apikey": api_key,
        "outputsize": outputsize,
        "datatype": "json",
    }

    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()

    return response.json()


def normalize_alpha_vantage_daily(
    data: Dict[str, Any], symbol: str
) -> List[Dict[str, Any]]:
    """
    Normalize Alpha Vantage daily data to canonical format

    Args:
        data: Alpha Vantage API response
        symbol: Stock symbol

    Returns:
        List of normalized OHLCV records
    """
    normalized = []

    # Alpha Vantage returns data in "Time Series (Daily)" key
    time_series_key = None
    for key in data.keys():
        if "Time Series" in key:
            time_series_key = key
            break

    if not time_series_key:
        return normalized

    time_series = data[time_series_key]

    for date_str, values in time_series.items():
        try:
            normalized.append(
                {
                    "date": date_str,
                    "open": float(values.get("1. open", 0)),
                    "high": float(values.get("2. high", 0)),
                    "low": float(values.get("3. low", 0)),
                    "close": float(values.get("4. close", 0)),
                    "adj_close": float(
                        values.get("5. adjusted close", values.get("4. close", 0))
                    ),
                    "volume": float(values.get("6. volume", 0)),
                    "currency": "USD",  # Alpha Vantage defaults to USD
                    "source": "alpha_vantage",
                }
            )
        except (ValueError, KeyError):
            continue

    return normalized
