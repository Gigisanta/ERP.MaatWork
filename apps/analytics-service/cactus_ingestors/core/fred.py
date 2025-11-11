"""
FRED (Federal Reserve Economic Data) fetcher
"""

import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# FRED API rate limit: 120 requests per 60 seconds
FRED_RATE_LIMITER = RateLimiter(max_calls=120, period=60.0)


def fetch_fred_series(
    series_id: str,
    api_key: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    frequency: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch FRED series data
    
    Args:
        series_id: FRED series ID (e.g., 'CPIAUCSL' for CPI)
        api_key: FRED API key
        start: Start date (YYYY-MM-DD)
        end: End date (YYYY-MM-DD)
        frequency: Data frequency (d, w, bw, m, q, sa, a, wef, wel, etc.)
        
    Returns:
        Dict with observations data
    """
    FRED_RATE_LIMITER.wait_if_needed("fred")
    
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json"
    }
    
    if start:
        params["observation_start"] = start
    else:
        params["observation_start"] = "1990-01-01"  # Default to 1990
    
    if end:
        params["observation_end"] = end
    
    if frequency:
        params["frequency"] = frequency
    
    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    return data


def get_fred_series_info(series_id: str, api_key: str) -> Dict[str, Any]:
    """
    Get FRED series metadata
    
    Args:
        series_id: FRED series ID
        api_key: FRED API key
        
    Returns:
        Dict with series information
    """
    FRED_RATE_LIMITER.wait_if_needed("fred")
    
    url = "https://api.stlouisfed.org/fred/series"
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json"
    }
    
    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    return data


def normalize_fred_observations(observations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalize FRED observations to canonical format
    
    Args:
        observations: List of FRED observation dicts
        
    Returns:
        List of normalized observation dicts
    """
    normalized = []
    for obs in observations:
        # FRED uses '.' for missing values
        if obs.get("value") == ".":
            continue
        
        normalized.append({
            "date": obs["date"],
            "value": float(obs["value"]),
            "revision_id": None  # FRED doesn't provide revision IDs in observations
        })
    
    return normalized




