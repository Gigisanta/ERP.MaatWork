"""
Risk metrics calculation
Returns (log), volatility, Sharpe, Sortino, Max Drawdown, rolling beta
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple


def calculate_log_returns(prices: pd.Series) -> pd.Series:
    """
    Calculate logarithmic returns
    
    Args:
        prices: Price series
        
    Returns:
        Log returns series
    """
    return np.log(prices / prices.shift(1))


def calculate_annualized_volatility(
    returns: pd.Series,
    periods_per_year: int = 252
) -> float:
    """
    Calculate annualized volatility
    
    Args:
        returns: Returns series
        periods_per_year: Trading periods per year (252 for daily, 12 for monthly)
        
    Returns:
        Annualized volatility
    """
    return returns.std() * np.sqrt(periods_per_year)


def calculate_sharpe_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252
) -> float:
    """
    Calculate Sharpe ratio
    
    Args:
        returns: Returns series
        risk_free_rate: Risk-free rate (annual)
        periods_per_year: Trading periods per year
        
    Returns:
        Sharpe ratio
    """
    excess_returns = returns - (risk_free_rate / periods_per_year)
    if excess_returns.std() == 0:
        return 0.0
    return (excess_returns.mean() * periods_per_year) / (excess_returns.std() * np.sqrt(periods_per_year))


def calculate_sortino_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252
) -> float:
    """
    Calculate Sortino ratio (only penalizes downside volatility)
    
    Args:
        returns: Returns series
        risk_free_rate: Risk-free rate (annual)
        periods_per_year: Trading periods per year
        
    Returns:
        Sortino ratio
    """
    excess_returns = returns - (risk_free_rate / periods_per_year)
    downside_returns = excess_returns[excess_returns < 0]
    
    if len(downside_returns) == 0 or downside_returns.std() == 0:
        return 0.0
    
    downside_std = downside_returns.std() * np.sqrt(periods_per_year)
    if downside_std == 0:
        return 0.0
    
    return (excess_returns.mean() * periods_per_year) / downside_std


def calculate_max_drawdown(prices: pd.Series) -> Tuple[float, pd.Timestamp, pd.Timestamp]:
    """
    Calculate maximum drawdown
    
    Args:
        prices: Price series
        
    Returns:
        Tuple of (max_drawdown, peak_date, trough_date)
    """
    cumulative = (1 + prices.pct_change()).cumprod()
    running_max = cumulative.expanding().max()
    drawdown = (cumulative - running_max) / running_max
    max_dd = drawdown.min()
    
    # Find dates
    trough_idx = drawdown.idxmin()
    peak_idx = running_max[:trough_idx].idxmax() if trough_idx else None
    
    return max_dd, peak_idx, trough_idx


def calculate_rolling_beta(
    asset_returns: pd.Series,
    benchmark_returns: pd.Series,
    window: int = 60
) -> pd.Series:
    """
    Calculate rolling beta vs benchmark
    
    Args:
        asset_returns: Asset returns series
        benchmark_returns: Benchmark returns series
        window: Rolling window size
        
    Returns:
        Rolling beta series
    """
    # Align series
    aligned = pd.DataFrame({
        'asset': asset_returns,
        'benchmark': benchmark_returns
    }).dropna()
    
    if len(aligned) < window:
        return pd.Series(dtype=float)
    
    beta = aligned['asset'].rolling(window=window).cov(aligned['benchmark']) / aligned['benchmark'].rolling(window=window).var()
    
    return beta


def calculate_all_risk_metrics(
    prices: pd.Series,
    benchmark_prices: Optional[pd.Series] = None,
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252
) -> Dict[str, Any]:
    """
    Calculate all risk metrics
    
    Args:
        prices: Asset price series
        benchmark_prices: Benchmark price series (optional)
        risk_free_rate: Risk-free rate (annual)
        periods_per_year: Trading periods per year
        
    Returns:
        Dict with all risk metrics
    """
    returns = calculate_log_returns(prices).dropna()
    
    if len(returns) == 0:
        return {}
    
    metrics: Dict[str, Any] = {
        'annualized_volatility': calculate_annualized_volatility(returns, periods_per_year),
        'sharpe_ratio': calculate_sharpe_ratio(returns, risk_free_rate, periods_per_year),
        'sortino_ratio': calculate_sortino_ratio(returns, risk_free_rate, periods_per_year)
    }
    
    max_dd, peak_date, trough_date = calculate_max_drawdown(prices)
    metrics['max_drawdown'] = max_dd
    metrics['max_drawdown_peak_date'] = peak_date.isoformat() if peak_date else None
    metrics['max_drawdown_trough_date'] = trough_date.isoformat() if trough_date else None
    
    # Calculate beta if benchmark provided
    if benchmark_prices is not None:
        benchmark_returns = calculate_log_returns(benchmark_prices).dropna()
        # Align series
        aligned_returns = returns.align(benchmark_returns, join='inner')[0]
        aligned_benchmark = returns.align(benchmark_returns, join='inner')[1]
        
        if len(aligned_returns) > 0 and len(aligned_benchmark) > 0:
            rolling_beta = calculate_rolling_beta(aligned_returns, aligned_benchmark)
            metrics['beta'] = aligned_returns.cov(aligned_benchmark) / aligned_benchmark.var() if aligned_benchmark.var() > 0 else 0.0
            metrics['rolling_beta'] = rolling_beta.iloc[-1] if len(rolling_beta) > 0 and not pd.isna(rolling_beta.iloc[-1]) else None
    
    return metrics




