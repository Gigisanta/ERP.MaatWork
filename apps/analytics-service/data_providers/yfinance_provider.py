"""YFinance provider - wrapper para mantener consistencia con otros providers"""
import yfinance as yf
from typing import Optional
from datetime import datetime
import logging
from . import PriceData

logger = logging.getLogger(__name__)


class YFinanceProvider:
    """Provider para Yahoo Finance (stocks, ETFs, algunos crypto)"""
    
    name = "YFinance"
    
    def fetch_price(self, symbol: str) -> PriceData:
        """Obtiene precio actual de Yahoo Finance"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            
            if hist.empty:
                return PriceData(
                    symbol=symbol,
                    price=0.0,
                    currency="USD",
                    date=datetime.now().strftime("%Y-%m-%d"),
                    source="yfinance",
                    success=False,
                    error=f"No data available for {symbol}"
                )
            
            latest_price = hist.iloc[-1]["Close"]
            
            # Determinar moneda
            currency = self._get_currency_for_symbol(symbol)
            
            return PriceData(
                symbol=symbol,
                price=float(latest_price),
                currency=currency,
                date=hist.index[-1].strftime("%Y-%m-%d"),
                source="yfinance",
                success=True
            )
            
        except Exception as e:
            logger.error(f"YFinance error for {symbol}: {str(e)}")
            return PriceData(
                symbol=symbol,
                price=0.0,
                currency="USD",
                date=datetime.now().strftime("%Y-%m-%d"),
                source="yfinance",
                success=False,
                error=str(e)
            )
    
    def _get_currency_for_symbol(self, symbol: str) -> str:
        """Determinar la moneda basada en el símbolo"""
        # Mapeo de símbolos argentinos a ARS
        ars_symbols = [
            "^MERV",
            "^IAMC",  # Índices argentinos
            ".BA",  # Sufijo de acciones argentinas
        ]

        if any(suffix in symbol for suffix in ars_symbols) or symbol.endswith(".BA"):
            return "ARS"

        # Por defecto, asumir USD
        return "USD"



