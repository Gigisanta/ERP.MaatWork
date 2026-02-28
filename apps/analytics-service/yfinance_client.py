import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import backoff
import pandas as pd
import yfinance as yf
from cachetools import TTLCache

logger = logging.getLogger(__name__)


class YFinanceClient:
    """Cliente para obtener datos de yfinance con fallback a otros providers"""

    def __init__(self):
        self.session = None
        # Cache ligero en memoria: 5 minutos para precios actuales, 1 hora históricos
        self._current_price_cache = TTLCache(maxsize=1024, ttl=300)
        self._historical_cache = TTLCache(maxsize=256, ttl=3600)
        # AI_DECISION: Inicializar orquestador de providers como fallback
        # Justificación: yfinance library puede fallar temporalmente, usar cascada de providers
        # Impacto: Mejora disponibilidad y robustez del servicio
        from data_providers import DataProviderOrchestrator
        self.orchestrator = DataProviderOrchestrator()
    @backoff.on_exception(
        backoff.expo, Exception, max_tries=3, jitter=backoff.full_jitter
    )
    def fetch_current_prices(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Obtener precios actuales para una lista de símbolos

        Args:
            symbols: Lista de símbolos (ej: ['^MERV', 'GGAL.BA', 'AAPL'])

        Returns:
            Dict con precios por símbolo
        """
        results = {}

        # Intentar servir desde cache si todos los símbolos presentes
        cache_hit = True
        for s in symbols:
            if s in self._current_price_cache:
                results[s] = self._current_price_cache[s]
            else:
                cache_hit = False
        if cache_hit and results:
            return results

        try:
            # Usar yf.download para obtener múltiples símbolos a la vez
            # AI_DECISION: Usar download() en lugar de Ticker() con símbolos concatenados
            # Justificación: yf.Ticker() no soporta múltiples símbolos, yf.download() sí
            # Impacto: Obtiene datos de forma eficiente para múltiples símbolos
            hist = yf.download(
                symbols,
                period="2d",
                progress=False
            )

            if hist.empty:
                logger.warning(f"yf.download returned empty for {symbols}, trying orchestrator fallback")
                # yf.download falló, intentar símbolo por símbolo con orquestador
                for symbol in symbols:
                    try:
                        result = self.fetch_single_symbol(symbol)
                        results[symbol] = result
                    except Exception as single_error:
                        logger.error(
                            f"Error fetching individual symbol {symbol}: {str(single_error)}"
                        )
                        results[symbol] = {"error": str(single_error), "success": False}
                return results
            # Obtener último precio disponible
            # Si hay múltiples símbolos, Close es un DataFrame, si es uno, es Series
            latest_data = hist.iloc[-1]

            for symbol in symbols:
                try:
                    if symbol in hist.columns.get_level_values(0):
                        # Para múltiples símbolos, el DataFrame tiene MultiIndex en columnas
                        latest_price = hist[(symbol, 'Close')].iloc[-1]
                        last_date = hist.index[-1]

                        results[symbol] = {
                            "price": float(latest_price),
                            "currency": self._get_currency_for_symbol(symbol),
                            "date": last_date.strftime("%Y-%m-%d"),
                            "source": "yfinance",
                            "success": True,
                        }
                        self._current_price_cache[symbol] = results[symbol]
                    else:
                        results[symbol] = {
                            "error": f"No data available for {symbol}",
                            "success": False,
                        }

                except Exception as e:
                    logger.error(f"Error processing symbol {symbol}: {str(e)}")
                    results[symbol] = {"error": str(e), "success": False}

        except Exception as e:
            logger.error(f"Error fetching prices for symbols {symbols}: {str(e)}")
            # Si falla todo, intentar símbolo por símbolo
            for symbol in symbols:
                try:
                    result = self.fetch_single_symbol(symbol)
                    results[symbol] = result
                except Exception as single_error:
                    logger.error(
                        f"Error fetching individual symbol {symbol}: {str(single_error)}"
                    )
                    results[symbol] = {"error": str(single_error), "success": False}
        return results

    def fetch_single_symbol(self, symbol: str) -> Dict:
        """Obtener datos para un solo símbolo con fallback a otros providers"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")

            if hist.empty:
                # yfinance no tiene datos, intentar con orquestador de providers
                logger.warning(f"yfinance empty for {symbol}, trying orchestrator fallback")
                return self._try_orchestrator(symbol)

            latest_price = hist.iloc[-1]["Close"]

            return {
                "price": float(latest_price),
                "currency": self._get_currency_for_symbol(symbol),
                "date": hist.index[-1].strftime("%Y-%m-%d"),
                "source": "yfinance",
                "success": True,
            }

        except Exception as e:
            logger.warning(f"yfinance failed for {symbol}: {str(e)}, trying orchestrator fallback")
            return self._try_orchestrator(symbol)

    def _try_orchestrator(self, symbol: str) -> Dict:
        """Intentar obtener datos usando el orquestador de providers"""
        try:
            # Determinar tipo de activo basado en el símbolo
            asset_type = 'stock'
            if symbol.endswith('BTC') or symbol.endswith('ETH') or 'USD' in symbol or symbol in ['BTC', 'ETH']:
                asset_type = 'crypto'
            elif '/' in symbol or symbol.startswith(('USD', 'EUR', 'ARS')):
                asset_type = 'forex'

            result = self.orchestrator.fetch_price(symbol, asset_type)

            if result.success:
                return {
                    "price": result.price,
                    "currency": result.currency,
                    "date": result.date,
                    "source": result.source,
                    "success": True,
                }
            else:
                return {"error": result.error or "All providers failed", "success": False}

        except Exception as e:
            logger.error(f"Orchestrator failed for {symbol}: {str(e)}")
            return {"error": str(e), "success": False}
    @backoff.on_exception(
        backoff.expo, Exception, max_tries=3, jitter=backoff.full_jitter
    )
    def fetch_historical_prices(
        self, symbols: List[str], start_date: str, end_date: str
    ) -> Dict[str, pd.DataFrame]:
        """
        Obtener precios históricos para una lista de símbolos

        Args:
            symbols: Lista de símbolos
            start_date: Fecha inicio (YYYY-MM-DD)
            end_date: Fecha fin (YYYY-MM-DD)

        Returns:
            Dict con DataFrames de precios por símbolo
        """
        results = {}
        cache_key = f"{','.join(sorted(symbols))}:{start_date}:{end_date}"
        if cache_key in self._historical_cache:
            return self._historical_cache[cache_key]

        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(start=start_date, end=end_date)

                if not hist.empty:
                    # Limpiar y formatear datos
                    hist = hist.reset_index()
                    hist["Date"] = hist["Date"].dt.strftime("%Y-%m-%d")
                    hist["Symbol"] = symbol

                    # Seleccionar columnas relevantes
                    hist = hist[["Date", "Symbol", "Close", "Volume"]].copy()
                    hist.columns = ["date", "symbol", "close_price", "volume"]

                    results[symbol] = hist
                else:
                    # yfinance no tiene datos, intentar con orquestador
                    logger.warning(f"yfinance empty for {symbol} historical data, trying orchestrator fallback")
                    results[symbol] = self._fetch_historical_from_orchestrator(symbol, start_date, end_date)

            except Exception as e:
                logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
                # Intentar con orquestador como fallback
                results[symbol] = self._fetch_historical_from_orchestrator(symbol, start_date, end_date)

        self._historical_cache[cache_key] = results
        return results

    def _fetch_historical_from_orchestrator(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        """Intentar obtener datos históricos usando orquestador de providers"""
        try:
            # Para datos históricos, usar Yahoo REST directamente
            from data_providers.yahoo_rest_provider import YahooRESTProvider
            
            provider = YahooRESTProvider()
            df = provider.fetch_historical_prices(symbol, start_date, end_date)
            
            if not df.empty:
                logger.info(f"✓ {symbol} historical data from yahoo-rest: {len(df)} records")
            else:
                logger.warning(f"✗ No historical data from yahoo-rest for {symbol}")
            
            return df
        except Exception as e:
            logger.error(f"Error in historical fallback for {symbol}: {str(e)}")
            return pd.DataFrame()

    def backfill_prices(
        self, symbols: List[str], days: int = 365
    ) -> Dict[str, List[Dict]]:
        """
        Backfill de precios históricos

        Args:
            symbols: Lista de símbolos
            days: Número de días hacia atrás

        Returns:
            Dict con listas de precios por símbolo
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        historical_data = self.fetch_historical_prices(symbols, start_str, end_str)

        # Convertir DataFrames a listas de diccionarios
        results = {}
        for symbol, df in historical_data.items():
            if not df.empty:
                results[symbol] = df.to_dict("records")
            else:
                results[symbol] = []

        return results

    def _get_currency_for_symbol(self, symbol: str) -> str:
        """
        Determinar la moneda basada en el símbolo

        Args:
            symbol: Símbolo del instrumento

        Returns:
            Código de moneda (ARS, USD, etc.)
        """
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

    def get_symbol_info(self, symbol: str) -> Dict:
        """
        Obtener información detallada de un símbolo con fallback a Yahoo REST API

        Args:
            symbol: Símbolo del instrumento

        Returns:
            Dict con información del instrumento
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            return {
                "symbol": symbol,
                "name": info.get("longName", symbol),
                "currency": info.get("currency", self._get_currency_for_symbol(symbol)),
                "market": info.get("exchange", "Unknown"),
                "sector": info.get("sector", "Unknown"),
                "industry": info.get("industry", "Unknown"),
                "success": True,
            }

        except Exception as e:
            logger.warning(f"yfinance failed for symbol info {symbol}: {str(e)}, trying Yahoo REST fallback")
            return self._get_symbol_info_from_rest(symbol)

    def _get_symbol_info_from_rest(self, symbol: str) -> Dict:
        """Obtener información del símbolo usando Yahoo REST API"""
        try:
            import requests
            
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
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
            
            if "chart" not in data or "result" not in data["chart"]:
                return {"symbol": symbol, "error": "Invalid response format", "success": False}
            
            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            
            return {
                "symbol": symbol,
                "name": meta.get("longName", meta.get("shortName", symbol)),
                "currency": meta.get("currency", self._get_currency_for_symbol(symbol)),
                "market": meta.get("exchangeName", "Unknown"),
                "sector": "Unknown",  # Yahoo REST API no proporciona sector
                "industry": "Unknown",  # Yahoo REST API no proporciona industry
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Yahoo REST failed for symbol info {symbol}: {str(e)}")
            return {"symbol": symbol, "error": str(e), "success": False}
    def search_symbols(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Buscar símbolos por nombre o ticker

        Args:
            query: Término de búsqueda (nombre de empresa o ticker)
            max_results: Máximo número de resultados

        Returns:
            Lista de símbolos encontrados con información
        """
        results = []

        try:
            # Lista de símbolos comunes para búsqueda
            common_symbols = {
                # Argentinos
                "GGAL": "Grupo Financiero Galicia",
                "YPF": "YPF S.A.",
                "PAMP": "Pampa Energía",
                "TXAR": "Transportadora de Gas del Norte",
                "IRSA": "IRSA Inversiones y Representaciones",
                "MIRG": "Mirgor",
                "ALUA": "Aluar Aluminio Argentino",
                "COME": "Comercial del Plata",
                "CRES": "Cresud",
                "LOMA": "Loma Negra",
                "MORI": "Morixe Hermanos",
                "PGR": "Phoenix Global Resources",
                "SUPV": "Grupo Supervielle",
                "TGSU2": "Transportadora de Gas del Sur",
                "TXAR": "Transportadora de Gas del Norte",
                "VALO": "Valor Compartido",
                # Índices argentinos
                "^MERV": "Merval Index",
                "^IAMC": "IAmC Index",
                # Internacionales
                "AAPL": "Apple Inc.",
                "GOOGL": "Alphabet Inc.",
                "MSFT": "Microsoft Corporation",
                "AMZN": "Amazon.com Inc.",
                "TSLA": "Tesla Inc.",
                "META": "Meta Platforms Inc.",
                "NVDA": "NVIDIA Corporation",
                "BRK-B": "Berkshire Hathaway Inc.",
                "JPM": "JPMorgan Chase & Co.",
                "JNJ": "Johnson & Johnson",
                "V": "Visa Inc.",
                "PG": "Procter & Gamble",
                "MA": "Mastercard Inc.",
                "UNH": "UnitedHealth Group",
                "HD": "Home Depot Inc.",
                "DIS": "Walt Disney Company",
                "ADBE": "Adobe Inc.",
                "CRM": "Salesforce Inc.",
                "NFLX": "Netflix Inc.",
                "PYPL": "PayPal Holdings Inc.",
                # Índices internacionales
                "^GSPC": "S&P 500",
                "^IXIC": "NASDAQ Composite",
                "^DJI": "Dow Jones Industrial Average",
                "^VIX": "CBOE Volatility Index",
                # ETFs
                "SPY": "SPDR S&P 500 ETF Trust",
                "QQQ": "Invesco QQQ Trust",
                "VTI": "Vanguard Total Stock Market ETF",
                "EEM": "iShares MSCI Emerging Markets ETF",
                "AGG": "iShares Core U.S. Aggregate Bond ETF",
                "GLD": "SPDR Gold Trust",
                "TLT": "iShares 20+ Year Treasury Bond ETF",
                "IWM": "iShares Russell 2000 ETF",
                "EFA": "iShares MSCI EAFE ETF",
                "VEA": "Vanguard FTSE Developed Markets ETF",
            }

            query_lower = query.lower()

            # Buscar coincidencias exactas primero
            for symbol, name in common_symbols.items():
                if (
                    query_lower in symbol.lower()
                    or query_lower in name.lower()
                    or symbol.lower().startswith(query_lower)
                ):

                    try:
                        # Obtener información adicional del símbolo
                        ticker = yf.Ticker(symbol)
                        info = ticker.info

                        result = {
                            "symbol": symbol,
                            "name": info.get("longName", name),
                            "shortName": info.get("shortName", symbol),
                            "currency": info.get(
                                "currency", self._get_currency_for_symbol(symbol)
                            ),
                            "exchange": info.get("exchange", "Unknown"),
                            "type": info.get("quoteType", "EQUITY"),
                            "sector": info.get("sector", "Unknown"),
                            "industry": info.get("industry", "Unknown"),
                            "marketCap": info.get("marketCap"),
                            "success": True,
                        }

                        results.append(result)

                        if len(results) >= max_results:
                            break

                    except Exception as e:
                        # Si falla la obtención de info, agregar resultado básico
                        results.append(
                            {
                                "symbol": symbol,
                                "name": name,
                                "shortName": symbol,
                                "currency": self._get_currency_for_symbol(symbol),
                                "exchange": "Unknown",
                                "type": "EQUITY",
                                "success": True,
                            }
                        )

                        if len(results) >= max_results:
                            break

            # Si no hay suficientes resultados, intentar búsqueda más amplia
            if len(results) < max_results:
                # Agregar más símbolos comunes si la búsqueda es muy específica
                additional_symbols = {
                    "BABA": "Alibaba Group",
                    "BIDU": "Baidu Inc.",
                    "JD": "JD.com Inc.",
                    "NIO": "NIO Inc.",
                    "XPEV": "XPeng Inc.",
                    "LI": "Li Auto Inc.",
                    "PDD": "PDD Holdings Inc.",
                    "TME": "Tencent Music Entertainment",
                    "VIPS": "Vipshop Holdings Ltd",
                    "YMM": "Full Truck Alliance Co.",
                }

                for symbol, name in additional_symbols.items():
                    if query_lower in symbol.lower() or query_lower in name.lower():
                        try:
                            ticker = yf.Ticker(symbol)
                            info = ticker.info

                            result = {
                                "symbol": symbol,
                                "name": info.get("longName", name),
                                "shortName": info.get("shortName", symbol),
                                "currency": info.get("currency", "USD"),
                                "exchange": info.get("exchange", "Unknown"),
                                "type": info.get("quoteType", "EQUITY"),
                                "sector": info.get("sector", "Unknown"),
                                "industry": info.get("industry", "Unknown"),
                                "success": True,
                            }

                            results.append(result)

                            if len(results) >= max_results:
                                break

                        except Exception:
                            continue

            return results

        except Exception as e:
            logger.error(f"Error searching symbols for query '{query}': {str(e)}")
            return []

    def validate_symbol(self, symbol: str) -> Dict:
        """
        Validar si un símbolo existe y obtener información básica con fallback

        Args:
            symbol: Símbolo a validar

        Returns:
            Dict con información de validación
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            # Verificar si el símbolo tiene información válida
            if info and "longName" in info:
                return {
                    "symbol": symbol,
                    "valid": True,
                    "name": info.get("longName", symbol),
                    "currency": info.get(
                        "currency", self._get_currency_for_symbol(symbol)
                    ),
                    "exchange": info.get("exchange", "Unknown"),
                    "type": info.get("quoteType", "EQUITY"),
                    "success": True,
                }
            else:
                return {
                    "symbol": symbol,
                    "valid": False,
                    "error": "Symbol not found or invalid",
                    "success": False,
                }

        except Exception as e:
            logger.warning(f"yfinance failed for validate {symbol}: {str(e)}, trying Yahoo REST fallback")
            return self._validate_symbol_from_rest(symbol)

    def _validate_symbol_from_rest(self, symbol: str) -> Dict:
        """Validar símbolo usando Yahoo REST API"""
        try:
            import requests
            
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
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
            
            if "chart" not in data or "result" not in data["chart"]:
                return {
                    "symbol": symbol,
                    "valid": False,
                    "error": "Symbol not found or invalid",
                    "success": False,
                }
            
            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            
            # Si tiene precio regular, el símbolo es válido
            if "regularMarketPrice" in meta:
                return {
                    "symbol": symbol,
                    "valid": True,
                    "name": meta.get("longName", meta.get("shortName", symbol)),
                    "currency": meta.get("currency", self._get_currency_for_symbol(symbol)),
                    "exchange": meta.get("exchangeName", "Unknown"),
                    "type": "EQUITY",
                    "success": True,
                }
            else:
                return {
                    "symbol": symbol,
                    "valid": False,
                    "error": "Symbol not found or invalid",
                    "success": False,
                }
            
        except Exception as e:
            return {
                "symbol": symbol,
                "valid": False,
                "error": str(e),
                "success": False,
            }

# Instancia global del cliente
yfinance_client = YFinanceClient()
