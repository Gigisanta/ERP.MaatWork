"""Yahoo Finance REST API provider - fallback cuando yfinance library falla"""
import requests
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import pandas as pd
from . import PriceData

logger = logging.getLogger(__name__)


class YahooRESTProvider:
    """Provider que usa Yahoo Finance REST API directamente (sin yfinance library)"""
    
    name = "Yahoo REST API"
    base_url = "https://query1.finance.yahoo.com/v8/finance/chart"
    
    def fetch_price(self, symbol: str) -> PriceData:
        """
        Obtiene precio usando Yahoo Finance REST API directamente
        
        AI_DECISION: Usar API REST de Yahoo directamente como fallback
        Justificación: La librería yfinance puede estar bloqueada pero la API REST puede funcionar
        Impacto: Fallback adicional robusto para stocks
        """
        try:
            # Construir URL
            url = f"{self.base_url}/{symbol}"
            params = {
                "range": "1d",
                "interval": "1d",
                "includePrePost": "false"
            }
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Extraer datos
            if "chart" not in data or "result" not in data["chart"]:
                raise ValueError(f"Invalid response format for {symbol}")
            
            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            
            if "regularMarketPrice" not in meta:
                raise ValueError(f"No price data for {symbol}")
            
            price = float(meta["regularMarketPrice"])
            currency = meta.get("currency", "USD")
            
            # Timestamp a fecha
            timestamp = meta.get("regularMarketTime", datetime.now().timestamp())
            date = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
            
            return PriceData(
                symbol=symbol,
                price=price,
                currency=currency,
                date=date,
                source="yahoo-rest",
                success=True
            )
            
        except Exception as e:
            logger.error(f"Yahoo REST API error for {symbol}: {str(e)}")
            return PriceData(
                symbol=symbol,
                price=0.0,
                currency="USD",
                date=datetime.now().strftime("%Y-%m-%d"),
                source="yahoo-rest",
                success=False,
                error=str(e)
            )

    def fetch_historical_prices(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        """Obtener datos históricos usando Yahoo Finance REST API"""
        try:
            # Convertir fechas a timestamps
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            period1 = int(start_dt.timestamp())
            period2 = int(end_dt.timestamp())
            
            url = f"{self.base_url}/{symbol}"
            params = {
                "period1": period1,
                "period2": period2,
                "interval": "1d",
                "includePrePost": "false"
            }
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Extraer datos
            if "chart" not in data or "result" not in data["chart"]:
                raise ValueError(f"Invalid response format for {symbol}")
            
            result = data["chart"]["result"][0]
            timestamps = result.get("timestamp", [])
            indicators = result.get("indicators", {})
            close_prices = indicators.get("quote", [{}])[0].get("close", [])
            volumes = indicators.get("quote", [{}])[0].get("volume", [])
            
            if not timestamps:
                logger.warning(f"No historical data for {symbol}")
                return pd.DataFrame()
            
            # Crear DataFrame
            data_rows = []
            for i, ts in enumerate(timestamps):
                date = datetime.fromtimestamp(ts)
                price = close_prices[i] if i < len(close_prices) else None
                volume = volumes[i] if i < len(volumes) else None
                
                data_rows.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "symbol": symbol,
                    "close_price": price,
                    "volume": volume
                })
            
            return pd.DataFrame(data_rows)
            
        except Exception as e:
            logger.error(f"Yahoo REST API error for historical data {symbol}: {str(e)}")
            return pd.DataFrame()
