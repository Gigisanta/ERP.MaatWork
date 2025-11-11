"""
Finnhub fetcher for market data
"""

import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# Finnhub rate limit: 60 calls per minute (free tier)
FINNHUB_RATE_LIMITER = RateLimiter(max_calls=60, period=60.0)


def fetch_quote(symbol: str, api_key: str) -> Dict[str, Any]:
    """
    Fetch real-time quote
    
    Args:
        symbol: Stock symbol
        api_key: Finnhub API key
        
    Returns:
        Quote data
    """
    FINNHUB_RATE_LIMITER.wait_if_needed("finnhub")
    
    url = "https://finnhub.io/api/v1/quote"
    params = {
        "symbol": symbol,
        "token": api_key
    }
    
    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()
    
    return response.json()


def fetch_company_profile(symbol: str, api_key: str) -> Dict[str, Any]:
    """
    Fetch company profile (fundamentals)
    
    Args:
        symbol: Stock symbol
        api_key: Finnhub API key
        
    Returns:
        Company profile data
    """
    FINNHUB_RATE_LIMITER.wait_if_needed("finnhub")
    
    url = "https://finnhub.io/api/v1/stock/profile2"
    params = {
        "symbol": symbol,
        "token": api_key
    }
    
    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()
    
    return response.json()


def fetch_candle(
    symbol: str,
    api_key: str,
    resolution: str = "D",
    from_timestamp: Optional[int] = None,
    to_timestamp: Optional[int] = None
) -> Dict[str, Any]:
    """
    Fetch OHLCV candle data
    
    Args:
        symbol: Stock symbol
        api_key: Finnhub API key
        resolution: 1, 5, 15, 30, 60, D, W, M
        from_timestamp: Unix timestamp (optional)
        to_timestamp: Unix timestamp (optional)
        
    Returns:
        Candle data
    """
    FINNHUB_RATE_LIMITER.wait_if_needed("finnhub")
    
    url = "https://finnhub.io/api/v1/stock/candle"
    params = {
        "symbol": symbol,
        "resolution": resolution,
        "token": api_key
    }
    
    if from_timestamp:
        params["from"] = from_timestamp
    if to_timestamp:
        params["to"] = to_timestamp
    
    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()
    
    return response.json()


def normalize_finnhub_candle(data: Dict[str, Any], symbol: str) -> List[Dict[str, Any]]:
    """
    Normalize Finnhub candle data to canonical format
    
    Args:
        data: Finnhub API response
        symbol: Stock symbol
        
    Returns:
        List of normalized OHLCV records
    """
    normalized = []
    
    if data.get("s") != "ok":
        return normalized
    
    timestamps = data.get("t", [])
    opens = data.get("o", [])
    highs = data.get("h", [])
    lows = data.get("l", [])
    closes = data.get("c", [])
    volumes = data.get("v", [])
    
    for i in range(len(timestamps)):
        try:
            # Convert timestamp to date
            timestamp = datetime.fromtimestamp(timestamps[i])
            
            normalized.append({
                "timestamp": timestamp.isoformat(),
                "open": float(opens[i]),
                "high": float(highs[i]),
                "low": float(lows[i]),
                "close": float(closes[i]),
                "volume": float(volumes[i]) if i < len(volumes) else 0,
                "currency": "USD",  # Finnhub defaults to USD
                "source": "finnhub"
            })
        except (ValueError, IndexError, KeyError):
            continue
    
    return normalized




