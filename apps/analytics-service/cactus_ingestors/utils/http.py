"""
HTTP utilities with retries, ETag/If-Modified-Since support
"""

import random
import time
from typing import Any, Dict, Optional

import requests

DEFAULT_HEADERS = {"User-Agent": "Mozilla/5.0 CactusBot/1.0"}


def http_get(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    retries: int = 3,
    backoff: float = 1.5,
    etag_cache: Optional[Dict[str, str]] = None,
    ims: Optional[str] = None,
    timeout: int = 30,
) -> requests.Response:
    """
    HTTP GET with retries, ETag/If-Modified-Since support

    Args:
        url: URL to fetch
        params: Query parameters
        headers: Additional headers
        retries: Number of retry attempts
        backoff: Backoff multiplier
        etag_cache: Dict to store/retrieve ETags (key: url, value: etag)
        ims: If-Modified-Since header value
        timeout: Request timeout in seconds

    Returns:
        requests.Response object
    """
    hdrs = DEFAULT_HEADERS.copy()
    if headers:
        hdrs.update(headers)
    if etag_cache and url in etag_cache:
        hdrs["If-None-Match"] = etag_cache[url]
    if ims:
        hdrs["If-Modified-Since"] = ims

    for i in range(retries):
        try:
            r = requests.get(url, params=params, headers=hdrs, timeout=timeout)
            if r.status_code in (200, 304):
                if r.headers.get("ETag") and etag_cache is not None:
                    etag_cache[url] = r.headers["ETag"]
                return r
            if r.status_code < 500:
                # Client error, don't retry
                r.raise_for_status()
        except requests.RequestException as e:
            if i == retries - 1:
                raise
            time.sleep(backoff * (i + 1) + random.random())

    raise requests.RequestException(f"Failed after {retries} retries")
