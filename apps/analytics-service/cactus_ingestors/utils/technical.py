"""
Technical indicators calculation
SMA, EMA, RSI, MACD, ATR, Bollinger Bands
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional


def calculate_sma(prices: pd.Series, period: int) -> pd.Series:
    """
    Calculate Simple Moving Average
    
    Args:
        prices: Price series (usually close prices)
        period: SMA period
        
    Returns:
        SMA series
    """
    return prices.rolling(window=period).mean()


def calculate_ema(prices: pd.Series, period: int) -> pd.Series:
    """
    Calculate Exponential Moving Average
    
    Args:
        prices: Price series
        period: EMA period
        
    Returns:
        EMA series
    """
    return prices.ewm(span=period, adjust=False).mean()


def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate Relative Strength Index
    
    Args:
        prices: Price series
        period: RSI period (default 14)
        
    Returns:
        RSI series (0-100)
    """
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi


def calculate_macd(
    prices: pd.Series,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9
) -> Dict[str, pd.Series]:
    """
    Calculate MACD (Moving Average Convergence Divergence)
    
    Args:
        prices: Price series
        fast_period: Fast EMA period
        slow_period: Slow EMA period
        signal_period: Signal line period
        
    Returns:
        Dict with macd, signal, and histogram
    """
    ema_fast = calculate_ema(prices, fast_period)
    ema_slow = calculate_ema(prices, slow_period)
    macd_line = ema_fast - ema_slow
    signal_line = calculate_ema(macd_line, signal_period)
    histogram = macd_line - signal_line
    
    return {
        'macd': macd_line,
        'signal': signal_line,
        'histogram': histogram
    }


def calculate_atr(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    period: int = 14
) -> pd.Series:
    """
    Calculate Average True Range
    
    Args:
        high: High prices
        low: Low prices
        close: Close prices
        period: ATR period
        
    Returns:
        ATR series
    """
    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()
    
    return atr


def calculate_bollinger_bands(
    prices: pd.Series,
    period: int = 20,
    num_std: float = 2.0
) -> Dict[str, pd.Series]:
    """
    Calculate Bollinger Bands
    
    Args:
        prices: Price series
        period: Moving average period
        num_std: Number of standard deviations
        
    Returns:
        Dict with upper, middle, and lower bands
    """
    sma = calculate_sma(prices, period)
    std = prices.rolling(window=period).std()
    
    upper_band = sma + (std * num_std)
    lower_band = sma - (std * num_std)
    
    return {
        'upper': upper_band,
        'middle': sma,
        'lower': lower_band
    }


def calculate_all_indicators(
    df: pd.DataFrame,
    close_col: str = 'close',
    high_col: str = 'high',
    low_col: str = 'low'
) -> pd.DataFrame:
    """
    Calculate all technical indicators for a DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        close_col: Column name for close prices
        high_col: Column name for high prices
        low_col: Column name for low prices
        
    Returns:
        DataFrame with added indicator columns
    """
    result = df.copy()
    
    close = df[close_col]
    high = df[high_col]
    low = df[low_col]
    
    # Moving averages
    result['sma_20'] = calculate_sma(close, 20)
    result['sma_50'] = calculate_sma(close, 50)
    result['sma_200'] = calculate_sma(close, 200)
    result['ema_20'] = calculate_ema(close, 20)
    result['ema_50'] = calculate_ema(close, 50)
    
    # RSI
    result['rsi'] = calculate_rsi(close, 14)
    
    # MACD
    macd = calculate_macd(close)
    result['macd'] = macd['macd']
    result['macd_signal'] = macd['signal']
    result['macd_histogram'] = macd['histogram']
    
    # ATR
    result['atr'] = calculate_atr(high, low, close, 14)
    
    # Bollinger Bands
    bb = calculate_bollinger_bands(close, 20, 2.0)
    result['bb_upper'] = bb['upper']
    result['bb_middle'] = bb['middle']
    result['bb_lower'] = bb['lower']
    
    return result




