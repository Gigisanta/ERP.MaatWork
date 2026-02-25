import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import backoff
import pandas as pd
import yfinance as yf
from cachetools import TTLCache

logger = logging.getLogger(__name__)


class YFinanceClient:
    """Cliente para obtener datos de yfinance"""

    def __init__(self):
        self.session = None
        # Cache ligero en memoria: 5 minutos para precios actuales, 1 hora históricos
        self._current_price_cache = TTLCache(maxsize=1024, ttl=300)
        self._historical_cache = TTLCache(maxsize=256, ttl=3600)

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
            # Crear ticker para todos los símbolos
            ticker = yf.Ticker(" ".join(symbols))

            # Obtener información histórica (último día disponible)
            hist = ticker.history(period="2d")  # 2 días para asegurar datos

            if hist.empty:
                logger.warning(f"No se encontraron datos para símbolos: {symbols}")
                return results

            # Obtener último precio disponible
            latest_data = hist.iloc[-1]

            for symbol in symbols:
                try:
                    # Para múltiples símbolos, yfinance puede devolver datos agrupados
                    # Intentar obtener datos específicos del símbolo
                    symbol_data = (
                        hist.xs(symbol, level=1)
                        if hasattr(hist.columns, "levels")
                        else hist
                    )

                    if len(symbol_data) > 0:
                        latest_price = symbol_data.iloc[-1]["Close"]

                        results[symbol] = {
                            "price": float(latest_price),
                            "currency": self._get_currency_for_symbol(symbol),
                            "date": symbol_data.index[-1].strftime("%Y-%m-%d"),
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
        """Obtener datos para un solo símbolo"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")

            if hist.empty:
                return {"error": f"No data available for {symbol}", "success": False}

            latest_price = hist.iloc[-1]["Close"]

            return {
                "price": float(latest_price),
                "currency": self._get_currency_for_symbol(symbol),
                "date": hist.index[-1].strftime("%Y-%m-%d"),
                "source": "yfinance",
                "success": True,
            }

        except Exception as e:
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
                    logger.warning(f"No historical data found for {symbol}")
                    results[symbol] = pd.DataFrame()

            except Exception as e:
                logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
                results[symbol] = pd.DataFrame()

        self._historical_cache[cache_key] = results
        return results

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
        Obtener información detallada de un símbolo

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
        Validar si un símbolo existe y obtener información básica

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
            return {"symbol": symbol, "valid": False, "error": str(e), "success": False}


# Instancia global del cliente
yfinance_client = YFinanceClient()
