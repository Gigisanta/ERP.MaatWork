"""
Módulo para cálculo de rendimiento de carteras usando datos históricos de Yahoo Finance.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import yfinance as yf

from yfinance_client import YFinanceClient

logger = logging.getLogger(__name__)


@dataclass
class PortfolioComponent:
    """Componente de una cartera con peso y símbolo."""

    symbol: str
    weight: float  # Peso como decimal (0.1 = 10%)
    name: Optional[str] = None


@dataclass
class PerformanceData:
    """Datos de rendimiento de una cartera."""

    portfolio_id: str
    portfolio_name: str
    period: str
    start_date: datetime
    end_date: datetime
    total_return: float  # Retorno total del período
    annualized_return: float  # Retorno anualizado
    volatility: float  # Volatilidad anualizada
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    performance_series: Optional[List[Dict]] = None  # Serie temporal diaria


class PortfolioPerformanceCalculator:
    """Calculador de rendimiento de carteras."""

    def __init__(self):
        self.yfinance_client = YFinanceClient()
        self.risk_free_rate = 0.02  # Tasa libre de riesgo anual (2% por defecto)

    def calculate_portfolio_performance(
        self,
        portfolio_id: str,
        portfolio_name: str,
        components: List[PortfolioComponent],
        period: str = "1Y",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> PerformanceData:
        """
        Calcula el rendimiento de una cartera para un período dado.

        Args:
            portfolio_id: ID único de la cartera
            portfolio_name: Nombre de la cartera
            components: Lista de componentes con símbolos y pesos
            period: Período de análisis ("1M", "3M", "6M", "1Y", "YTD", "ALL")
            start_date: Fecha de inicio (opcional, se calcula desde period si no se proporciona)
            end_date: Fecha de fin (opcional, por defecto hoy)

        Returns:
            PerformanceData con métricas calculadas
        """
        try:
            # Calcular fechas
            end_date = end_date or datetime.now()
            start_date = start_date or self._calculate_start_date(period, end_date)

            # Validar componentes
            if not components:
                raise ValueError("La cartera debe tener al menos un componente")

            # Verificar que los pesos sumen 1.0
            total_weight = sum(comp.weight for comp in components)
            if abs(total_weight - 1.0) > 0.01:
                raise ValueError(
                    f"Los pesos deben sumar 1.0, actual: {total_weight:.4f}"
                )

            # Obtener datos históricos para todos los componentes
            price_data = self._fetch_historical_data(components, start_date, end_date)

            if price_data.empty:
                raise ValueError(
                    "No se pudieron obtener datos históricos para los componentes"
                )

            # Calcular rendimiento de la cartera
            portfolio_returns = self._calculate_portfolio_returns(
                price_data, components
            )

            # Calcular métricas
            total_return = self._calculate_total_return(portfolio_returns)
            annualized_return = self._calculate_annualized_return(
                portfolio_returns, start_date, end_date
            )
            volatility = self._calculate_volatility(portfolio_returns)
            sharpe_ratio = self._calculate_sharpe_ratio(
                portfolio_returns, annualized_return
            )
            max_drawdown = self._calculate_max_drawdown(portfolio_returns)

            # Crear serie temporal de rendimiento acumulado
            performance_series = self._create_performance_series(
                portfolio_returns, start_date
            )

            return PerformanceData(
                portfolio_id=portfolio_id,
                portfolio_name=portfolio_name,
                period=period,
                start_date=start_date,
                end_date=end_date,
                total_return=total_return,
                annualized_return=annualized_return,
                volatility=volatility,
                sharpe_ratio=sharpe_ratio,
                max_drawdown=max_drawdown,
                performance_series=performance_series,
            )

        except Exception as e:
            logger.error(
                f"Error calculating portfolio performance for {portfolio_id}: {str(e)}"
            )
            raise

    def _calculate_start_date(self, period: str, end_date: datetime) -> datetime:
        """Calcula la fecha de inicio basada en el período."""
        period_map = {
            "1M": timedelta(days=30),
            "3M": timedelta(days=90),
            "6M": timedelta(days=180),
            "1Y": timedelta(days=365),
            "YTD": timedelta(days=datetime.now().timetuple().tm_yday),
            "ALL": timedelta(days=365 * 10),  # 10 años para "ALL"
        }

        if period not in period_map:
            raise ValueError(f"Período no válido: {period}")

        return end_date - period_map[period]

    def _fetch_historical_data(
        self,
        components: List[PortfolioComponent],
        start_date: datetime,
        end_date: datetime,
    ) -> pd.DataFrame:
        """Obtiene datos históricos para todos los componentes de la cartera."""
        all_data = {}

        for component in components:
            try:
                # Usar yfinance directamente para obtener datos históricos
                ticker = yf.Ticker(component.symbol)
                hist = ticker.history(start=start_date, end=end_date)

                if not hist.empty:
                    # Usar precios de cierre
                    all_data[component.symbol] = hist["Close"]
                else:
                    logger.warning(f"No se encontraron datos para {component.symbol}")

            except Exception as e:
                logger.error(f"Error fetching data for {component.symbol}: {str(e)}")
                continue

        if not all_data:
            raise ValueError("No se pudieron obtener datos para ningún componente")

        # Crear DataFrame con todos los datos
        df = pd.DataFrame(all_data)

        # Interpolar valores faltantes y eliminar filas con NaN
        df = df.interpolate(method="linear").dropna()

        return df

    def _calculate_portfolio_returns(
        self, price_data: pd.DataFrame, components: List[PortfolioComponent]
    ) -> pd.Series:
        """Calcula los retornos diarios de la cartera."""
        # Calcular retornos diarios para cada componente
        returns_data = price_data.pct_change().dropna()

        # Crear diccionario de pesos
        weights = {comp.symbol: comp.weight for comp in components}

        # Calcular retorno ponderado de la cartera
        portfolio_returns = pd.Series(index=returns_data.index, dtype=float)

        for date in returns_data.index:
            daily_return = 0.0
            for symbol, weight in weights.items():
                if symbol in returns_data.columns:
                    daily_return += returns_data.loc[date, symbol] * weight

            portfolio_returns[date] = daily_return

        return portfolio_returns.dropna()

    def _calculate_total_return(self, returns: pd.Series) -> float:
        """Calcula el retorno total del período."""
        return (1 + returns).prod() - 1

    def _calculate_annualized_return(
        self, returns: pd.Series, start_date: datetime, end_date: datetime
    ) -> float:
        """Calcula el retorno anualizado."""
        total_return = self._calculate_total_return(returns)
        years = (end_date - start_date).days / 365.25
        return (1 + total_return) ** (1 / years) - 1 if years > 0 else 0

    def _calculate_volatility(self, returns: pd.Series) -> float:
        """Calcula la volatilidad anualizada."""
        return returns.std() * np.sqrt(252)  # 252 días de trading por año

    def _calculate_sharpe_ratio(
        self, returns: pd.Series, annualized_return: float
    ) -> float:
        """Calcula el ratio de Sharpe."""
        volatility = self._calculate_volatility(returns)
        if volatility == 0:
            return 0
        return (annualized_return - self.risk_free_rate) / volatility

    def _calculate_max_drawdown(self, returns: pd.Series) -> float:
        """Calcula la máxima pérdida desde el pico."""
        cumulative = (1 + returns).cumprod()
        rolling_max = cumulative.expanding().max()
        drawdown = (cumulative - rolling_max) / rolling_max
        return drawdown.min()

    def _create_performance_series(
        self, returns: pd.Series, start_date: datetime
    ) -> List[Dict]:
        """Crea serie temporal de rendimiento acumulado normalizada a 100."""
        cumulative = (1 + returns).cumprod() * 100  # Normalizar a base 100

        return [
            {"date": date.strftime("%Y-%m-%d"), "value": round(value, 2)}
            for date, value in cumulative.items()
        ]

    def compare_portfolios(
        self,
        portfolios: List[
            Tuple[str, str, List[PortfolioComponent]]
        ],  # (id, name, components)
        period: str = "1Y",
    ) -> Dict[str, PerformanceData]:
        """
        Compara múltiples carteras para el mismo período.

        Args:
            portfolios: Lista de tuplas (id, name, components)
            period: Período de comparación

        Returns:
            Diccionario con PerformanceData para cada cartera
        """
        results = {}

        for portfolio_id, portfolio_name, components in portfolios:
            try:
                performance = self.calculate_portfolio_performance(
                    portfolio_id=portfolio_id,
                    portfolio_name=portfolio_name,
                    components=components,
                    period=period,
                )
                results[portfolio_id] = performance

            except Exception as e:
                logger.error(f"Error comparing portfolio {portfolio_id}: {str(e)}")
                continue

        return results


# Instancia global del calculador
portfolio_calculator = PortfolioPerformanceCalculator()
