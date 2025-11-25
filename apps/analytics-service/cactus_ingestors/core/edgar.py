"""
SEC EDGAR fetcher for filings (10-K, 10-Q, 8-K, etc.)
"""

import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# SEC EDGAR rate limit: 10 requests per second
EDGAR_RATE_LIMITER = RateLimiter(max_calls=10, period=1.0)

# Required User-Agent format for SEC EDGAR
EDGAR_HEADERS = {
    "User-Agent": "CactusBot/1.0 giolivo.santarelli@example.com",  # TODO: Update email
    "Accept": "application/json"
}


def fetch_submissions(cik: int) -> Dict[str, Any]:
    """
    Fetch SEC EDGAR submissions for a CIK
    
    Args:
        cik: Central Index Key (10-digit, zero-padded)
        
    Returns:
        Dict with submissions data
    """
    EDGAR_RATE_LIMITER.wait_if_needed("edgar")
    
    # Pad CIK to 10 digits
    cik_str = f"{int(cik):010d}"
    url = f"https://data.sec.gov/submissions/CIK{cik_str}.json"
    
    response = http_get(url, headers=EDGAR_HEADERS, timeout=30)
    response.raise_for_status()
    
    return response.json()


def fetch_company_facts(cik: int) -> Dict[str, Any]:
    """
    Fetch SEC EDGAR company facts (XBRL data)
    
    Args:
        cik: Central Index Key (10-digit, zero-padded)
        
    Returns:
        Dict with company facts data
    """
    EDGAR_RATE_LIMITER.wait_if_needed("edgar")
    
    # Pad CIK to 10 digits
    cik_str = f"{int(cik):010d}"
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_str}.json"
    
    response = http_get(url, headers=EDGAR_HEADERS, timeout=30)
    response.raise_for_status()
    
    return response.json()


def normalize_submissions(submissions_data: Dict[str, Any], ticker: str, cik: str) -> List[Dict[str, Any]]:
    """
    Normalize SEC EDGAR submissions to canonical format
    
    Args:
        submissions_data: SEC EDGAR submissions response
        ticker: Stock ticker
        cik: CIK
        
    Returns:
        List of normalized filing records
    """
    normalized = []
    
    filings = submissions_data.get("filings", {})
    recent = filings.get("recent", {})
    
    forms = recent.get("form", [])
    filing_dates = recent.get("filingDate", [])
    report_dates = recent.get("reportDate", [])
    accession_numbers = recent.get("accessionNumber", [])
    
    for i in range(len(forms)):
        form = forms[i]
        # Only process relevant forms
        if form not in ["10-K", "10-Q", "8-K", "DEF 14A", "SC 13G", "SC 13D"]:
            continue
        
        try:
            filing_date = filing_dates[i]
            accession_number = accession_numbers[i].replace("-", "")
            
            # Build EDGAR URL
            url = f"https://www.sec.gov/cgi-bin/viewer?action=view&cik={cik}&accession_number={accession_number}&xbrl_type=v"
            
            normalized.append({
                "ticker": ticker,
                "cik": cik,
                "form": form,
                "filed_at": filing_date,
                "url": url,
                "provider": "sec_edgar"
            })
        except (IndexError, ValueError, KeyError):
            continue
    
    return normalized


def get_cik_from_ticker(ticker: str) -> Optional[str]:
    """
    Get CIK from ticker using SEC company tickers JSON
    
    Args:
        ticker: Stock ticker
        
    Returns:
        CIK as string or None
    """
    EDGAR_RATE_LIMITER.wait_if_needed("edgar")
    
    try:
        url = "https://www.sec.gov/files/company_tickers.json"
        response = http_get(url, headers=EDGAR_HEADERS, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # SEC returns data as a dict with numeric keys
        for entry in data.values():
            if entry.get("ticker", "").upper() == ticker.upper():
                return str(entry.get("cik_str", ""))
        
        return None
    except Exception:
        return None




