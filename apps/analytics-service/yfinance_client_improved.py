import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from cachetools import TTLCache
import backoff
import logging

logger = logging.getLogger(__name__)

class YFinanceClientImproved:
    """
    Cliente mejorado para obtener datos de yfinance
    
    AI_DECISION: Eliminar listas hardcodeadas y usar APIs reales
    Justificación: Permite buscar cualquier símbolo sin límites artificiales
    Impacto: Búsqueda más flexible, escalable y profesional
    """
    
    def __init__(self):
        self.session = None
        # Cache ligero en memoria: 5 minutos para precios actuales, 1 hora históricos
        self._current_price_cache = TTLCache(maxsize=1024, ttl=300)
        self._historical_cache = TTLCache(maxsize=256, ttl=3600)
        self._symbol_info_cache = TTLCache(maxsize=2048, ttl=1800)  # 30 min cache para info
    
    def search_symbols(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Buscar símbolos por nombre o ticker usando Yahoo Finance
        
        Estrategia:
        1. Validar si el query es un símbolo directo
        2. Buscar en sugerencias populares solo como complemento
        3. NO depender de listas hardcodeadas como fuente principal
        
        Args:
            query: Término de búsqueda (nombre de empresa o ticker)
            max_results: Máximo número de resultados
            
        Returns:
            Lista de símbolos encontrados con información
        """
        results = []
        query_clean = query.strip().upper()
        
        try:
            # Estrategia 1: Si el query parece un símbolo, validarlo directamente
            if self._looks_like_symbol(query_clean):
                direct_result = self._try_direct_symbol(query_clean)
                if direct_result:
                    results.append(direct_result)
                    logger.info(f"Direct symbol match: {query_clean}")
            
            # Estrategia 2: Buscar en sugerencias SOLO si no hay resultados o query es ambiguo
            if len(results) < max_results:
                suggestions = self._get_matching_suggestions(query.lower())
                for symbol, name in suggestions[:max_results - len(results)]:
                    # Evitar duplicados
                    if any(r['symbol'] == symbol for r in results):
                        continue
                    
                    suggestion_result = self._try_direct_symbol(symbol)
                    if suggestion_result:
                        results.append(suggestion_result)
            
            # Si no hay resultados pero el query parece válido, sugerir validación directa
            if not results and len(query_clean) > 0:
                logger.warning(f"No results for query '{query}', suggesting direct validation")
                return [{
                    'symbol': query_clean,
                    'name': f'Try validating symbol: {query_clean}',
                    'shortName': query_clean,
                    'type': 'SUGGESTION',
                    'success': False,
                    'message': 'No exact matches. Try validating this symbol directly.'
                }]
                    
        except Exception as e:
            logger.error(f"Error searching symbols: {str(e)}")
        
        return results[:max_results]
    
    def _looks_like_symbol(self, text: str) -> bool:
        """Determinar si el texto parece un símbolo válido"""
        if not text:
            return False
        # Símbolos típicos: 1-10 chars, alfanuméricos + ^.-_
        if len(text) > 10:
            return False
        allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789^.-_')
        return all(c in allowed_chars for c in text)
    
    def _try_direct_symbol(self, symbol: str) -> Optional[Dict]:
        """
        Intentar obtener información de un símbolo directamente
        Returns None si no es válido
        """
        try:
            # Verificar cache primero
            if symbol in self._symbol_info_cache:
                return self._symbol_info_cache[symbol]
            
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Verificar múltiples condiciones de validez
            has_price = any(key in info for key in [
                'regularMarketPrice', 'currentPrice', 'previousClose', 'navPrice', 'bid', 'ask'
            ])
            has_name = 'longName' in info or 'shortName' in info
            has_exchange = 'exchange' in info or 'fullExchangeName' in info
            
            # El símbolo es válido si tiene precio O (nombre Y exchange)
            is_valid = has_price or (has_name and has_exchange)
            
            if not is_valid:
                logger.debug(f"Symbol {symbol} failed validation checks")
                return None
            
            result = {
                'symbol': symbol,
                'name': info.get('longName', info.get('shortName', symbol)),
                'shortName': info.get('shortName', symbol),
                'currency': info.get('currency', self._get_currency_for_symbol(symbol)),
                'exchange': info.get('exchange', info.get('fullExchangeName', 'Unknown')),
                'type': info.get('quoteType', 'EQUITY'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'marketCap': info.get('marketCap'),
                'success': True
            }
            
            # Cachear resultado exitoso
            self._symbol_info_cache[symbol] = result
            return result
            
        except Exception as e:
            logger.debug(f"Failed to fetch symbol {symbol}: {str(e)}")
            return None
    
    def _get_matching_suggestions(self, query: str) -> List[tuple]:
        """
        Obtener sugerencias que matcheen el query.
        Lista PEQUEÑA solo para mejorar UX en búsquedas comunes.
        NO es la única fuente de símbolos.
        """
        # Lista reducida de símbolos MÁS populares como sugerencias rápidas
        popular_symbols = [
            # Índices globales principales
            ('^GSPC', 'S&P 500 Index'),
            ('^IXIC', 'NASDAQ Composite'),
            ('^DJI', 'Dow Jones Industrial Average'),
            ('^MERV', 'Merval Argentina Index'),
            
            # Top 10 tech (más buscados)
            ('AAPL', 'Apple Inc.'),
            ('MSFT', 'Microsoft Corporation'),
            ('GOOGL', 'Alphabet Inc.'),
            ('AMZN', 'Amazon.com Inc.'),
            ('TSLA', 'Tesla Inc.'),
            ('META', 'Meta Platforms Inc.'),
            ('NVDA', 'NVIDIA Corporation'),
            
            # Top ETFs
            ('SPY', 'SPDR S&P 500 ETF'),
            ('QQQ', 'Invesco QQQ Trust'),
            ('VOO', 'Vanguard S&P 500 ETF'),
            
            # Principales argentinos
            ('GGAL', 'Grupo Financiero Galicia'),
            ('YPF', 'YPF S.A.'),
            ('PAMP', 'Pampa Energía'),
        ]
        
        # Filtrar solo los que matcheen
        matches = [
            (symbol, name) for symbol, name in popular_symbols
            if query in symbol.lower() or query in name.lower()
        ]
        
        # Ordenar: símbolos que empiecen con query primero
        matches.sort(key=lambda x: (
            0 if x[0].lower().startswith(query) else 1,
            x[0]
        ))
        
        return matches
    
    def validate_symbol(self, symbol: str) -> Dict:
        """
        Validar que un símbolo existe y obtener su información completa
        
        AI_DECISION: Mejorar validación con múltiples checks
        Justificación: Yahoo Finance puede retornar info parcial; ser más flexible
        Impacto: Mejor tasa de éxito en validación de símbolos reales
        
        Args:
            symbol: Símbolo a validar
            
        Returns:
            Dict con información completa del símbolo
        """
        try:
            result = self._try_direct_symbol(symbol.upper())
            
            if result:
                # Agregar precio actual si disponible
                price = self._get_current_price_fast(symbol.upper())
                if price:
                    result['currentPrice'] = price
                    result['priceAvailable'] = True
                else:
                    result['priceAvailable'] = False
                
                result['valid'] = True
                return result
            else:
                return {
                    'valid': False,
                    'symbol': symbol.upper(),
                    'error': 'Symbol not found or has insufficient data',
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"Error validating symbol {symbol}: {str(e)}")
            return {
                'valid': False,
                'symbol': symbol.upper(),
                'error': str(e),
                'success': False
            }
    
    def _get_current_price_fast(self, symbol: str) -> Optional[float]:
        """Obtener precio actual rápido (con cache)"""
        try:
            if symbol in self._current_price_cache:
                return self._current_price_cache[symbol].get('price')
            
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1d", interval="1d")
            
            if not hist.empty:
                price = float(hist.iloc[-1]['Close'])
                self._current_price_cache[symbol] = {'price': price}
                return price
                
        except Exception as e:
            logger.debug(f"Could not fetch current price for {symbol}: {str(e)}")
        
        return None
    
    def _get_currency_for_symbol(self, symbol: str) -> str:
        """Inferir moneda basado en el símbolo"""
        if '.BA' in symbol or '.BC' in symbol:
            return 'ARS'
        elif '^MERV' in symbol:
            return 'ARS'
        elif '.L' in symbol:
            return 'GBP'
        elif '.TO' in symbol or '.V' in symbol:
            return 'CAD'
        elif '.AX' in symbol:
            return 'AUD'
        elif '.HK' in symbol:
            return 'HKD'
        elif '.T' in symbol:
            return 'JPY'
        else:
            return 'USD'
    
    # Mantener métodos originales de fetch_current_prices y fetch_historical_prices
    # (copiar del archivo original sin cambios)
    @backoff.on_exception(backoff.expo, Exception, max_tries=3, jitter=backoff.full_jitter)
    def fetch_current_prices(self, symbols: List[str]) -> Dict[str, Dict]:
        """Mantener implementación original"""
        # TODO: Copiar desde el archivo original
        pass
    
    def fetch_historical_prices(
        self, symbol: str, start_date: Optional[datetime] = None, 
        end_date: Optional[datetime] = None, period: str = "1y"
    ) -> pd.DataFrame:
        """Mantener implementación original"""
        # TODO: Copiar desde el archivo original
        pass

# Instancia global mejorada
yfinance_client_improved = YFinanceClientImproved()

