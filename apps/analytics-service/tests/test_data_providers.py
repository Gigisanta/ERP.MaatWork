"""
Tests para verificar que todas las fuentes retornan datos REALES

AI_DECISION: Tests de integración para validar datos reales
Justificación: Garantizar que nunca se retornen datos inventados
Impacto: Confianza en la integridad de los datos para decisiones financieras
"""
import pytest
from data_providers import DataProviderOrchestrator
from data_providers.yfinance_provider import YFinanceProvider
from data_providers.coingecko_provider import CoinGeckoProvider
from data_providers.coincap_provider import CoinCapProvider
from data_providers.eodhd_provider import EODHDProvider
from data_providers.exchangerate_provider import ExchangeRateProvider


def test_yfinance_real_data():
    """Verificar que yfinance retorna datos reales para AAPL"""
    provider = YFinanceProvider()
    result = provider.fetch_price("AAPL")
    
    assert result.success is True, f"YFinance failed: {result.error}"
    assert result.price > 0, "Precio debe ser mayor a 0"
    assert result.currency == "USD"
    assert result.source == "yfinance"
    # El precio de AAPL debe estar en un rango razonable (100-300)
    assert 100 < result.price < 300, f"Precio de AAPL fuera de rango razonable: {result.price}"


def test_coingecko_real_data():
    """Verificar que CoinGecko retorna datos reales para BTC"""
    provider = CoinGeckoProvider()
    result = provider.fetch_price("BTC")
    
    assert result.success is True, f"CoinGecko failed: {result.error}"
    assert result.price > 0
    assert result.source == "coingecko"
    # BTC debe estar entre 20k-150k USD (rango histórico razonable)
    assert 20000 < result.price < 150000, f"Precio de BTC fuera de rango: {result.price}"


def test_coincap_real_data():
    """Verificar que CoinCap retorna datos reales para ETH"""
    provider = CoinCapProvider()
    result = provider.fetch_price("ETH")
    
    assert result.success is True, f"CoinCap failed: {result.error}"
    assert result.price > 0
    assert result.source == "coincap"
    # ETH debe estar entre 1k-10k USD (rango histórico razonable)
    assert 1000 < result.price < 10000, f"Precio de ETH fuera de rango: {result.price}"


def test_eodhd_real_data():
    """Verificar que EODHD retorna datos reales para SPY"""
    provider = EODHDProvider()
    result = provider.fetch_price("SPY")
    
    # EODHD demo key puede fallar, pero si funciona debe ser real
    if result.success:
        assert result.price > 0
        assert result.source == "eodhd"
        # SPY debe estar entre 300-600 USD (rango histórico razonable)
        assert 300 < result.price < 600, f"Precio de SPY fuera de rango: {result.price}"


def test_exchangerate_real_data():
    """Verificar que ExchangeRate-API retorna datos reales para EURUSD"""
    provider = ExchangeRateProvider()
    result = provider.fetch_price("EURUSD")
    
    assert result.success is True, f"ExchangeRate-API failed: {result.error}"
    assert result.price > 0
    assert result.source == "exchangerate-api"
    # EUR/USD debe estar entre 0.8-1.3 (rango histórico razonable)
    assert 0.8 < result.price < 1.3, f"Tipo de cambio EUR/USD fuera de rango: {result.price}"


def test_cascade_fallback():
    """Verificar que cascada funciona cuando yfinance falla"""
    orchestrator = DataProviderOrchestrator()
    
    # Probar con símbolo que puede fallar en yfinance pero existe en CoinGecko
    result = orchestrator.fetch_price("ETH", asset_type="crypto")
    
    assert result.success is True, f"Cascade failed: {result.error}"
    assert result.price > 0
    assert result.source in ["yfinance", "coingecko", "coincap"]


def test_no_fake_data():
    """Verificar que NUNCA se retornan datos inventados"""
    orchestrator = DataProviderOrchestrator()
    
    # Probar con símbolo inexistente
    result = orchestrator.fetch_price("FAKE_SYMBOL_12345", asset_type="stock")
    
    # Debe fallar explícitamente, NO retornar datos inventados
    assert result.success is False, "No debe retornar success=True para símbolos inexistentes"
    assert result.price == 0.0, "Precio debe ser 0.0 para símbolos inexistentes"
    assert result.error is not None, "Debe incluir mensaje de error"
    assert "failed" in result.error.lower() or "not found" in result.error.lower()


def test_multiple_symbols_stock():
    """Verificar que múltiples símbolos de stocks funcionan correctamente"""
    orchestrator = DataProviderOrchestrator()
    
    symbols = ["AAPL", "MSFT", "GOOGL"]
    results = []
    
    for symbol in symbols:
        result = orchestrator.fetch_price(symbol, asset_type="stock")
        results.append(result)
    
    # Al menos 2 de 3 deben tener éxito
    successful = [r for r in results if r.success]
    assert len(successful) >= 2, f"Solo {len(successful)}/3 símbolos tuvieron éxito"
    
    # Todos los exitosos deben tener precios razonables
    for result in successful:
        assert result.price > 0
        assert 50 < result.price < 500, f"{result.symbol}: precio fuera de rango"


def test_multiple_symbols_crypto():
    """Verificar que múltiples símbolos de crypto funcionan correctamente"""
    orchestrator = DataProviderOrchestrator()
    
    symbols = ["BTC", "ETH", "SOL"]
    results = []
    
    for symbol in symbols:
        result = orchestrator.fetch_price(symbol, asset_type="crypto")
        results.append(result)
    
    # Al menos 2 de 3 deben tener éxito
    successful = [r for r in results if r.success]
    assert len(successful) >= 2, f"Solo {len(successful)}/3 símbolos tuvieron éxito"
    
    # Todos los exitosos deben tener precios razonables
    for result in successful:
        assert result.price > 0


@pytest.mark.parametrize("symbol,asset_type,min_price,max_price", [
    ("AAPL", "stock", 100, 300),
    ("BTC", "crypto", 20000, 150000),
    ("EURUSD", "forex", 0.8, 1.3),
])
def test_price_ranges(symbol, asset_type, min_price, max_price):
    """Verificar que los precios están en rangos razonables"""
    orchestrator = DataProviderOrchestrator()
    result = orchestrator.fetch_price(symbol, asset_type=asset_type)
    
    if result.success:
        assert min_price < result.price < max_price, \
            f"{symbol}: precio {result.price} fuera de rango [{min_price}, {max_price}]"



