"""
Stooq.com fetcher for historical OHLCV data
"""

import io
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pandas as pd
import requests

from ..utils.http import http_get
from ..utils.ratelimit import RateLimiter

# Stooq doesn't have official rate limits, but be respectful
STOOQ_RATE_LIMITER = RateLimiter(max_calls=10, period=1.0)


def fetch_stooq_csv(symbol: str, timeframe: str = "d") -> pd.DataFrame:
    """
    Fetch OHLCV data from Stooq as CSV

    Args:
        symbol: Symbol (e.g., 'AAPL', '^MERV', 'GGAL.BA')
        timeframe: Timeframe ('d'=daily, 'h'=hourly, 'm'=minute)

    Returns:
        pandas DataFrame with OHLCV data
    """
    STOOQ_RATE_LIMITER.wait_if_needed("stooq")

    url = f"https://stooq.com/q/l/?s={symbol.lower()}&i={timeframe}"

    response = http_get(url, timeout=30)
    response.raise_for_status()

    # Parse CSV
    df = pd.read_csv(io.StringIO(response.text))

    return df


def normalize_stooq_data(
    df: pd.DataFrame, symbol: str, currency: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Normalize Stooq DataFrame to canonical format

    Args:
        df: Stooq DataFrame
        symbol: Symbol
        currency: Currency code (inferred if not provided)

    Returns:
        List of normalized OHLCV records
    """
    if df.empty:
        return []

    # Stooq CSV columns: Date, Open, High, Low, Close, Volume
    # Handle different column name variations
    date_col = None
    for col in df.columns:
        if "date" in col.lower() or col.lower() == "date":
            date_col = col
            break

    if not date_col:
        # Try using index if it's a datetime index
        if isinstance(df.index, pd.DatetimeIndex):
            df = df.reset_index()
            date_col = df.columns[0]
        else:
            raise ValueError("Could not find date column in Stooq data")

    normalized = []
    for _, row in df.iterrows():
        try:
            date_val = row[date_col]
            if isinstance(date_val, str):
                date_val = pd.to_datetime(date_val).date()
            elif hasattr(date_val, "date"):
                date_val = date_val.date()

            # Get OHLCV values
            open_val = float(row.get("Open", row.get("open", 0)))
            high_val = float(row.get("High", row.get("high", 0)))
            low_val = float(row.get("Low", row.get("low", 0)))
            close_val = float(row.get("Close", row.get("close", 0)))
            volume_val = float(row.get("Volume", row.get("volume", 0)))

            # Skip rows with invalid data
            if open_val == 0 and high_val == 0 and low_val == 0 and close_val == 0:
                continue

            normalized.append(
                {
                    "date": date_val.isoformat(),
                    "open": open_val,
                    "high": high_val,
                    "low": low_val,
                    "close": close_val,
                    "adj_close": close_val,  # Stooq doesn't provide adjusted close separately
                    "volume": volume_val,
                    "currency": currency
                    or "USD",  # Default to USD, should be inferred from symbol
                    "source": "stooq",
                }
            )
        except (ValueError, KeyError, AttributeError) as e:
            # Skip invalid rows
            continue

    return normalized
