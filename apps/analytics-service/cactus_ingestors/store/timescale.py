"""
TimescaleDB store module for saving ingested data
"""

import os
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Dict, Any, Optional
from datetime import datetime


class TimescaleStore:
    """
    Store for TimescaleDB operations
    """
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize TimescaleDB connection
        
        Args:
            database_url: PostgreSQL connection string
        """
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
    
    def _get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.database_url)
    
    def save_macro_points(
        self,
        series_id: str,
        points: List[Dict[str, Any]]
    ) -> int:
        """
        Save macro data points
        
        Args:
            series_id: Series ID (UUID)
            points: List of data points
            
        Returns:
            Number of rows inserted
        """
        if not points:
            return 0
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                # Prepare data for bulk insert
                values = []
                for point in points:
                    values.append((
                        series_id,
                        point["date"],
                        point["value"],
                        point.get("revision_id"),
                        point.get("source_asof")
                    ))
                
                query = """
                    INSERT INTO macro_points (series_id, date, value, revision_id, source_asof)
                    VALUES %s
                    ON CONFLICT (series_id, date) DO UPDATE
                    SET value = EXCLUDED.value,
                        revision_id = EXCLUDED.revision_id,
                        source_asof = EXCLUDED.source_asof
                """
                
                execute_values(cur, query, values)
                conn.commit()
                return len(values)
        finally:
            conn.close()
    
    def save_yields(
        self,
        yields: List[Dict[str, Any]]
    ) -> int:
        """
        Save yield curve data
        
        Args:
            yields: List of yield data points
            
        Returns:
            Number of rows inserted
        """
        if not yields:
            return 0
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                values = []
                for yield_point in yields:
                    values.append((
                        yield_point["country"],
                        yield_point["tenor"],
                        yield_point["date"],
                        yield_point["value"],
                        yield_point["provider"]
                    ))
                
                query = """
                    INSERT INTO yields (country, tenor, date, value, provider)
                    VALUES %s
                    ON CONFLICT (country, tenor, date) DO UPDATE
                    SET value = EXCLUDED.value,
                        provider = EXCLUDED.provider
                """
                
                execute_values(cur, query, values)
                conn.commit()
                return len(values)
        finally:
            conn.close()
    
    def save_prices_daily(
        self,
        asset_id: str,
        prices: List[Dict[str, Any]]
    ) -> int:
        """
        Save daily OHLCV prices
        
        Args:
            asset_id: Asset ID (UUID)
            prices: List of price data points
            
        Returns:
            Number of rows inserted
        """
        if not prices:
            return 0
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                values = []
                for price in prices:
                    values.append((
                        asset_id,
                        price["date"],
                        price["open"],
                        price["high"],
                        price["low"],
                        price["close"],
                        price.get("adj_close"),
                        price.get("volume"),
                        price["currency"],
                        price["source"],
                        price.get("quality_flag", "normal")
                    ))
                
                query = """
                    INSERT INTO prices_daily (
                        asset_id, date, open, high, low, close, adj_close,
                        volume, currency, source, quality_flag
                    )
                    VALUES %s
                    ON CONFLICT (asset_id, date) DO UPDATE
                    SET open = EXCLUDED.open,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        close = EXCLUDED.close,
                        adj_close = EXCLUDED.adj_close,
                        volume = EXCLUDED.volume,
                        source = EXCLUDED.source,
                        quality_flag = EXCLUDED.quality_flag
                """
                
                execute_values(cur, query, values)
                conn.commit()
                return len(values)
        finally:
            conn.close()
    
    def save_events(
        self,
        events: List[Dict[str, Any]]
    ) -> int:
        """
        Save events (CNV Hechos Relevantes, etc.)
        
        Args:
            events: List of event data
            
        Returns:
            Number of rows inserted
        """
        if not events:
            return 0
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                values = []
                for event in events:
                    # Build text vector for full-text search
                    text_content = f"{event.get('title', '')} {event.get('description', '')}"
                    text_vector = f"to_tsvector('spanish', %s)" if event.get('country') == 'AR' else f"to_tsvector('english', %s)"
                    
                    values.append((
                        event["country"],
                        event.get("issuer"),
                        event["event_type"],
                        event["published_at"],
                        event["title"],
                        event.get("description"),
                        event.get("url"),
                        event["provider"],
                        text_content
                    ))
                
                query = """
                    INSERT INTO events (
                        country, issuer, event_type, published_at, title,
                        description, url, provider, text_vector
                    )
                    VALUES %s
                    ON CONFLICT DO NOTHING
                """
                
                # Note: text_vector needs special handling
                # For now, insert without text_vector and update separately
                insert_query = """
                    INSERT INTO events (
                        country, issuer, event_type, published_at, title,
                        description, url, provider
                    )
                    VALUES %s
                    ON CONFLICT DO NOTHING
                """
                
                execute_values(cur, insert_query, [
                    (
                        event["country"],
                        event.get("issuer"),
                        event["event_type"],
                        event["published_at"],
                        event["title"],
                        event.get("description"),
                        event.get("url"),
                        event["provider"]
                    ) for event in events
                ])
                
                # Update text_vector separately
                for event in events:
                    text_content = f"{event.get('title', '')} {event.get('description', '')}"
                    lang = 'spanish' if event.get('country') == 'AR' else 'english'
                    update_query = f"""
                        UPDATE events
                        SET text_vector = to_tsvector('{lang}', %s)
                        WHERE country = %s AND issuer = %s AND published_at = %s
                    """
                    cur.execute(update_query, (
                        text_content,
                        event["country"],
                        event.get("issuer"),
                        event["published_at"]
                    ))
                
                conn.commit()
                return len(events)
        finally:
            conn.close()




