"""
Multi-source data provider with cascade/fallback strategy.

AI_DECISION: Cascada automática entre fuentes para máxima disponibilidad
Justificación: Usuario seleccionó estrategia "cascade" para velocidad
Impacto: Si yfinance falla (429), automáticamente intenta EODHD, luego CoinGecko, etc.
"""
from typing import Dict, List, Optional
import logging
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class PriceData:
    """Datos de precio normalizados de cualquier fuente"""
    symbol: str
    price: float
    currency: str
    date: str  # YYYY-MM-DD
    source: str  # 'yfinance', 'coingecko', 'eodhd', etc.
    success: bool
    error: Optional[str] = None


class DataProviderOrchestrator:
    """Orquestador que intenta múltiples fuentes en cascada"""
    
    def __init__(self):
        from .yfinance_provider import YFinanceProvider
        from .yahoo_rest_provider import YahooRESTProvider
        from .coingecko_provider import CoinGeckoProvider
        from .coincap_provider import CoinCapProvider
        from .eodhd_provider import EODHDProvider
        from .exchangerate_provider import ExchangeRateProvider
        
        # AI_DECISION: Agregar Yahoo REST API como segundo fallback para stocks
        # Justificación: La API REST puede funcionar cuando yfinance library está bloqueada
        # Impacto: Mayor disponibilidad para stocks
        
        # Orden de cascada por tipo de activo
        self.stock_providers = [
            YFinanceProvider(),
            YahooRESTProvider(),  # Fallback cuando yfinance library falla
            EODHDProvider(),  # Demo keys para símbolos populares (limitado)
        ]
        
        self.crypto_providers = [
            CoinGeckoProvider(),
            CoinCapProvider(),
        ]
        
        self.forex_providers = [
            ExchangeRateProvider(),
            YFinanceProvider(),  # Fallback
            YahooRESTProvider(),  # Último fallback
        ]
    
    def fetch_price(self, symbol: str, asset_type: str = 'stock') -> PriceData:
        """
        Fetch precio con cascada automática
        
        Args:
            symbol: Símbolo del activo (ej: "AAPL", "BTC", "EURUSD")
            asset_type: Tipo de activo ('stock', 'crypto', 'forex', 'etf')
        
        Returns:
            PriceData con información del precio o error
        """
        providers = self._get_providers_for_asset(asset_type)
        
        for provider in providers:
            try:
                logger.debug(f"Trying {provider.name} for {symbol}")
                result = provider.fetch_price(symbol)
                
                if result.success:
                    logger.info(f"✓ {symbol}: {result.price} {result.currency} from {result.source}")
                    return result
                else:
                    logger.warning(f"✗ {provider.name} failed for {symbol}: {result.error}")
                    
            except Exception as e:
                logger.warning(f"✗ {provider.name} exception for {symbol}: {str(e)}")
                continue
        
        # Si todos fallan, retornar error
        return PriceData(
            symbol=symbol,
            price=0.0,
            currency="USD",
            date=datetime.now().strftime("%Y-%m-%d"),
            source="none",
            success=False,
            error=f"All providers failed for {symbol}"
        )
    
    def _get_providers_for_asset(self, asset_type: str):
        """Retorna lista de providers en orden de cascada según tipo de activo"""
        if asset_type == 'crypto':
            return self.crypto_providers
        elif asset_type == 'forex':
            return self.forex_providers
        else:  # stock, etf, default
            return self.stock_providers


__all__ = ['DataProviderOrchestrator', 'PriceData']

