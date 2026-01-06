"""ExchangeRate-API provider - API pública sin key requerida (forex)"""
import requests
from typing import Optional
from datetime import datetime
import logging
from . import PriceData

logger = logging.getLogger(__name__)


class ExchangeRateProvider:
    """Provider para ExchangeRate-API (forex rates)"""
    
    name = "ExchangeRate-API"
    base_url = "https://open.er-api.com/v6"
    
    # Monedas soportadas comunes
    SUPPORTED_CURRENCIES = {
        "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "CNY",
        "INR", "BRL", "MXN", "ZAR", "RUB", "KRW", "SGD", "HKD", "NOK",
        "SEK", "DKK", "PLN", "THB", "IDR", "MYR", "PHP", "CZK", "ILS",
        "CLP", "ARS", "COP", "PEN", "UYU"
    }
    
    def fetch_price(self, symbol: str) -> PriceData:
        """
        Obtiene tipo de cambio forex
        
        Formato esperado: "EURUSD", "GBPUSD", etc. (par de monedas)
        """
        try:
            # Parsear par de monedas (ej: EURUSD -> EUR/USD)
            if len(symbol) == 6:
                base_currency = symbol[:3].upper()
                quote_currency = symbol[3:].upper()
            elif "/" in symbol:
                parts = symbol.split("/")
                base_currency = parts[0].upper()
                quote_currency = parts[1].upper()
            else:
                return PriceData(
                    symbol=symbol,
                    price=0.0,
                    currency="USD",
                    date=datetime.now().strftime("%Y-%m-%d"),
                    source="exchangerate-api",
                    success=False,
                    error=f"Invalid forex pair format: {symbol}. Expected format: EURUSD or EUR/USD"
                )
            
            # Verificar que las monedas estén soportadas
            if base_currency not in self.SUPPORTED_CURRENCIES or quote_currency not in self.SUPPORTED_CURRENCIES:
                return PriceData(
                    symbol=symbol,
                    price=0.0,
                    currency=quote_currency,
                    date=datetime.now().strftime("%Y-%m-%d"),
                    source="exchangerate-api",
                    success=False,
                    error=f"Currency pair {base_currency}/{quote_currency} not supported"
                )
            
            # Fetch tipo de cambio
            url = f"{self.base_url}/latest/{base_currency}"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if "rates" not in data or quote_currency not in data["rates"]:
                raise ValueError(f"No rate data for {base_currency}/{quote_currency}")
            
            rate = float(data["rates"][quote_currency])
            
            # Obtener fecha de actualización
            time_last_update = data.get("time_last_update_unix", datetime.now().timestamp())
            date = datetime.fromtimestamp(time_last_update).strftime("%Y-%m-%d")
            
            return PriceData(
                symbol=symbol,
                price=rate,
                currency=quote_currency,
                date=date,
                source="exchangerate-api",
                success=True
            )
            
        except Exception as e:
            logger.error(f"ExchangeRate-API error for {symbol}: {str(e)}")
            return PriceData(
                symbol=symbol,
                price=0.0,
                currency="USD",
                date=datetime.now().strftime("%Y-%m-%d"),
                source="exchangerate-api",
                success=False,
                error=str(e)
            )



