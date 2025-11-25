"""
datos.gob.ar fetcher for Argentine macroeconomic data (BCRA, INDEC)
"""

import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# datos.gob.ar doesn't have strict rate limits, but be respectful
DATOS_GOB_AR_RATE_LIMITER = RateLimiter(max_calls=10, period=1.0)


def fetch_series_ar(
    series_ids: List[str],
    start: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch series from datos.gob.ar API
    
    Args:
        series_ids: List of series IDs
        start: Start date (YYYY-MM-DD)
        
    Returns:
        Dict with series data
    """
    DATOS_GOB_AR_RATE_LIMITER.wait_if_needed("datos_gob_ar")
    
    url = "https://datos.gob.ar/series/api/series/"
    params = {
        "ids": ",".join(series_ids),
        "format": "json"
    }
    
    if start:
        params["start_date"] = start
    else:
        params["start_date"] = "2010-01-01"  # Default to 2010
    
    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    return data


def normalize_series_ar_data(series_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Normalize datos.gob.ar series data to canonical format
    
    Args:
        series_data: datos.gob.ar API response
        
    Returns:
        List of normalized data points
    """
    normalized = []
    
    # datos.gob.ar returns data in a specific format
    # Adjust based on actual API response structure
    for series_id, series_info in series_data.items():
        data_points = series_info.get("data", [])
        for point in data_points:
            try:
                normalized.append({
                    "series_id": series_id,
                    "date": point.get("date") or point.get("indice_tiempo"),
                    "value": float(point.get("value") or point.get("valor")),
                    "provider": "datos_gob_ar"
                })
            except (ValueError, KeyError, TypeError):
                continue
    
    return normalized




