"""
CNV (Comisión Nacional de Valores) Hechos Relevantes scraper
Based on bloomberg.md specification
"""

import random
import time
from datetime import datetime
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup

from ..utils.http import http_get

BASE_URL = "https://www.cnv.gov.ar/sitioWeb/HechosRelevantes"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CactusBot/1.0)"}


def fetch_cnv_page(page: int = 1) -> str:
    """
    Fetch CNV Hechos Relevantes page HTML

    Args:
        page: Page number (1-indexed)

    Returns:
        HTML content
    """
    url = f"{BASE_URL}?page={page}"
    response = http_get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return response.text


def parse_cnv(html: str) -> List[Dict[str, Any]]:
    """
    Parse CNV HTML to extract Hechos Relevantes

    Args:
        html: HTML content

    Returns:
        List of parsed events
    """
    soup = BeautifulSoup(html, "html.parser")
    rows = []

    # Select table rows (adjust selector based on actual CNV page structure)
    items = soup.select("div#mainContent .table-responsive table tbody tr")

    for tr in items:
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue

        try:
            fecha_text = tds[0].get_text(strip=True)
            emisor = tds[1].get_text(strip=True)
            titulo = tds[2].get_text(strip=True)

            # Extract link
            a = tds[2].find("a")
            href = a.get("href") if a else None
            if href:
                if not href.startswith("http"):
                    href = f"https://www.cnv.gov.ar{href}"
            else:
                href = None

            # Parse date (adjust format based on actual CNV format)
            try:
                published_at = datetime.strptime(fecha_text, "%d/%m/%Y")
            except ValueError:
                # Try alternative formats
                try:
                    published_at = datetime.strptime(fecha_text, "%Y-%m-%d")
                except ValueError:
                    published_at = datetime.now()  # Fallback to now

            rows.append(
                {
                    "country": "AR",
                    "issuer": emisor,
                    "event_type": "hecho_relevante",
                    "published_at": published_at.isoformat(),
                    "title": titulo,
                    "description": None,  # Would need to fetch detail page
                    "url": href,
                    "provider": "cnv",
                }
            )
        except Exception as e:
            # Skip invalid rows
            continue

    return rows


def crawl_cnv(pages: int = 5, jitter: tuple = (0.8, 1.6)) -> List[Dict[str, Any]]:
    """
    Crawl multiple CNV pages

    Args:
        pages: Number of pages to crawl
        jitter: Sleep jitter range (min, max) in seconds

    Returns:
        List of all parsed events
    """
    all_rows = []
    for p in range(1, pages + 1):
        try:
            html = fetch_cnv_page(p)
            rows = parse_cnv(html)
            all_rows.extend(rows)

            # Sleep with jitter between pages
            if p < pages:
                sleep_time = random.uniform(*jitter)
                time.sleep(sleep_time)
        except Exception as e:
            # Continue on error
            continue

    return all_rows
