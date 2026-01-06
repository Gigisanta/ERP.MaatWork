"""EODHD provider - Demo API key para stocks populares"""
import requests
from typing import Optional
from datetime import datetime
import logging
from . import PriceData

logger = logging.getLogger(__name__)


class EODHDProvider:
    """Provider para EODHD API (stocks con demo key)"""
    
    name = "EODHD"
    base_url = "https://eodhd.com/api"
    
    # Demo API key (limitada pero funcional para símbolos populares)
    # AI_DECISION: Usar demo key pública para fallback
    # Justificación: Proporciona datos reales para símbolos populares sin necesidad de registro
    # Impacto: Fallback confiable cuando yfinance falla
    demo_api_key = "demo"
    
    # Símbolos soportados por demo key (los más populares)
    SUPPORTED_SYMBOLS = {
        "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "BRK-B",
        "JPM", "JNJ", "V", "PG", "MA", "UNH", "HD", "DIS", "ADBE", "CRM",
        "NFLX", "PYPL", "INTC", "CSCO", "VZ", "PFE", "KO", "PEP", "ABT",
        "TMO", "COST", "MRK", "AVGO", "NKE", "DHR", "TXN", "NEE", "LLY",
        "SPY", "QQQ", "VTI", "IWM", "EEM", "GLD", "TLT", "AGG", "EFA", "VEA"
    }
    
    def fetch_price(self, symbol: str) -> PriceData:
        """Obtiene precio actual de EODHD"""
        try:
            # Verificar si el símbolo está soportado por demo key
            symbol_upper = symbol.upper().replace("-", ".")  # BRK-B -> BRK.B
            
            if symbol_upper not in self.SUPPORTED_SYMBOLS:
                return PriceData(
                    symbol=symbol,
                    price=0.0,
                    currency="USD",
                    date=datetime.now().strftime("%Y-%m-%d"),
                    source="eodhd",
                    success=False,
                    error=f"Symbol {symbol} not supported by EODHD demo key"
                )
            
            # Fetch precio en tiempo real
            url = f"{self.base_url}/real-time/{symbol_upper}.US"
            params = {
                "api_token": self.demo_api_key,
                "fmt": "json"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if "close" not in data:
                raise ValueError(f"No price data for {symbol}")
            
            price = float(data["close"])
            
            # Obtener fecha del timestamp si está disponible
            timestamp = data.get("timestamp", datetime.now().timestamp())
            date = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
            
            return PriceData(
                symbol=symbol,
                price=price,
                currency="USD",
                date=date,
                source="eodhd",
                success=True
            )
            
        except Exception as e:
            logger.error(f"EODHD error for {symbol}: {str(e)}")
            return PriceData(
                symbol=symbol,
                price=0.0,
                currency="USD",
                date=datetime.now().strftime("%Y-%m-%d"),
                source="eodhd",
                success=False,
                error=str(e)
            )



