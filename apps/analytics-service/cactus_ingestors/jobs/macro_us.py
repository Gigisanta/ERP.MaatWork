"""
Job for ingesting US macroeconomic data (FRED + Treasury)
Runs daily at 07:15 ART
"""

import logging
import os
from datetime import datetime, timedelta

from ..core import fred, treasury
from ..store.timescale import TimescaleStore

logger = logging.getLogger(__name__)


# Key FRED series to fetch
FRED_SERIES = [
    {"id": "CPIAUCSL", "name": "Consumer Price Index", "category": "inflation"},
    {
        "id": "PCEPI",
        "name": "Personal Consumption Expenditures Price Index",
        "category": "inflation",
    },
    {"id": "UNRATE", "name": "Unemployment Rate", "category": "employment"},
    {"id": "M2SL", "name": "M2 Money Stock", "category": "monetary"},
    {"id": "FEDFUNDS", "name": "Effective Federal Funds Rate", "category": "monetary"},
]


async def ingest_macro_us():
    """
    Ingest US macroeconomic data from FRED and Treasury
    """
    logger.info("Starting US macro data ingestion")

    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        logger.error("FRED_API_KEY not set")
        return

    store = TimescaleStore()

    try:
        # Fetch FRED series
        for series_info in FRED_SERIES:
            try:
                logger.info(f"Fetching FRED series: {series_info['id']}")

                # Get series info
                series_data = fred.get_fred_series_info(series_info["id"], api_key)
                if (
                    not series_data
                    or "seriess" not in series_data
                    or len(series_data["seriess"]) == 0
                ):
                    logger.warning(f"Series {series_info['id']} not found")
                    continue

                series_meta = series_data["seriess"][0]

                # Check if series exists in DB, create if not
                # FUTURE_FEATURE: Implement macro_series upsert logic
                # Dependencies: macro_series table in DB schema

                # Fetch observations
                observations_data = fred.fetch_fred_series(series_info["id"], api_key)
                observations = observations_data.get("observations", [])

                # Normalize and save
                normalized = fred.normalize_fred_observations(observations)
                # FUTURE_FEATURE: Save to DB using store.save_macro_points
                # Dependencies: macro_points table, store module implementation

                logger.info(f"Fetched {len(normalized)} points for {series_info['id']}")

            except Exception as e:
                logger.error(f"Error fetching FRED series {series_info['id']}: {e}")
                continue

        # Fetch Treasury yields
        try:
            logger.info("Fetching Treasury yields")
            yields_data = treasury.fetch_treasury_rates()
            normalized_yields = treasury.normalize_treasury_yields([yields_data])

            # FUTURE_FEATURE: Save to DB using store.save_yields
            # Dependencies: yields table, store module implementation
            logger.info(f"Fetched Treasury yields for {len(normalized_yields)} tenors")

        except Exception as e:
            logger.error(f"Error fetching Treasury yields: {e}")

        logger.info("US macro data ingestion completed")

    except Exception as e:
        logger.error(f"Error in US macro data ingestion: {e}")
        raise


def run_macro_us_job():
    """Wrapper for APScheduler"""
    import asyncio

    asyncio.run(ingest_macro_us())
