"""
U.S. Treasury Fiscal Data API fetcher
"""

import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# Treasury API rate limit: 1000 requests per hour
TREASURY_RATE_LIMITER = RateLimiter(max_calls=1000, period=3600.0)


def fetch_treasury_yields(
    date: Optional[str] = None,
    fields: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Fetch U.S. Treasury yield curve data
    
    Args:
        date: Date in YYYY-MM-DD format (defaults to latest)
        fields: List of fields to return (defaults to all)
        
    Returns:
        List of yield data points
    """
    TREASURY_RATE_LIMITER.wait_if_needed("treasury")
    
    url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/avg_interest_rates"
    params = {
        "format": "json",
        "page[size]": 1000
    }
    
    if date:
        params["filter"] = f"record_date:eq:{date}"
    else:
        # Get latest data
        params["sort"] = "-record_date"
        params["page[size]"] = 100
    
    if fields:
        params["fields"] = ",".join(fields)
    
    response = http_get(url, params=params, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    return data.get("data", [])


def fetch_treasury_rates(
    date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch Treasury rates for common tenors
    
    Args:
        date: Date in YYYY-MM-DD format (defaults to latest)
        
    Returns:
        Dict mapping tenors to yields
    """
    data = fetch_treasury_yields(date=date)
    
    if not data:
        return {}
    
    # Extract latest record if no date specified
    latest = data[0] if data else {}
    
    # Map Treasury API fields to our tenor format
    yields = {}
    tenor_mapping = {
        "1_month": "1m",
        "3_month": "3m",
        "6_month": "6m",
        "1_year": "1y",
        "2_year": "2y",
        "5_year": "5y",
        "7_year": "7y",
        "10_year": "10y",
        "20_year": "20y",
        "30_year": "30y"
    }
    
    for api_field, tenor in tenor_mapping.items():
        value = latest.get(api_field)
        if value:
            try:
                yields[tenor] = float(value)
            except (ValueError, TypeError):
                pass
    
    return yields


def normalize_treasury_yields(yields_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalize Treasury yields to canonical format
    
    Args:
        yields_data: List of Treasury yield dicts
        
    Returns:
        List of normalized yield dicts
    """
    normalized = []
    tenor_mapping = {
        "1_month": "1m",
        "3_month": "3m",
        "6_month": "6m",
        "1_year": "1y",
        "2_year": "2y",
        "5_year": "5y",
        "7_year": "7y",
        "10_year": "10y",
        "20_year": "20y",
        "30_year": "30y"
    }
    
    for record in yields_data:
        record_date = record.get("record_date")
        if not record_date:
            continue
        
        for api_field, tenor in tenor_mapping.items():
            value = record.get(api_field)
            if value:
                try:
                    normalized.append({
                        "country": "US",
                        "tenor": tenor,
                        "date": record_date,
                        "value": float(value),
                        "provider": "treasury"
                    })
                except (ValueError, TypeError):
                    pass
    
    return normalized




