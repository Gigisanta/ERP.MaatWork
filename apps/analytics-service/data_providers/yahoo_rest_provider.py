"""Yahoo Finance REST API provider - fallback cuando yfinance library falla"""
import requests
from typing import Optional
from datetime import datetime
import logging
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



