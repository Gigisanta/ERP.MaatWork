"""CoinGecko provider - API pública sin key requerida"""
import requests
from typing import Optional
from datetime import datetime
import logging
from . import PriceData

logger = logging.getLogger(__name__)


class CoinGeckoProvider:
    """Provider para CoinGecko API (crypto)"""
    
    name = "CoinGecko"
    base_url = "https://api.coingecko.com/api/v3"
    
    # Mapeo de símbolos comunes a IDs de CoinGecko
    SYMBOL_MAP = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "USDT": "tether",
        "BNB": "binancecoin",
        "SOL": "solana",
        "ADA": "cardano",
        "DOGE": "dogecoin",
        "XRP": "ripple",
        "DOT": "polkadot",
        "MATIC": "matic-network",
        "AVAX": "avalanche-2",
        "LINK": "chainlink",
        "UNI": "uniswap",
        "ATOM": "cosmos",
        "LTC": "litecoin",
        "BCH": "bitcoin-cash",
        "ALGO": "algorand",
        "VET": "vechain",
        "FIL": "filecoin",
        "TRX": "tron",
        "ETC": "ethereum-classic",
        "XLM": "stellar",
        "THETA": "theta-token",
        "ICP": "internet-computer",
        "HBAR": "hedera-hashgraph",
        "NEAR": "near",
        "APT": "aptos",
        "ARB": "arbitrum",
        "OP": "optimism",
    }
    
    def fetch_price(self, symbol: str) -> PriceData:
        """Obtiene precio actual de CoinGecko"""
        try:
            # Convertir símbolo a ID de CoinGecko
            coin_id = self.SYMBOL_MAP.get(symbol.upper())
            if not coin_id:
                # Intentar buscar por símbolo
                coin_id = self._search_coin_id(symbol)
            
            if not coin_id:
                return PriceData(
                    symbol=symbol,
                    price=0.0,
                    currency="USD",
                    date=datetime.now().strftime("%Y-%m-%d"),
                    source="coingecko",
                    success=False,
                    error=f"Coin ID not found for {symbol}"
                )
            
            # Fetch precio
            url = f"{self.base_url}/simple/price"
            params = {
                "ids": coin_id,
                "vs_currencies": "usd",
                "include_last_updated_at": "true"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if coin_id not in data:
                raise ValueError(f"No data for {coin_id}")
            
            price = data[coin_id]["usd"]
            timestamp = data[coin_id].get("last_updated_at", datetime.now().timestamp())
            date = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
            
            return PriceData(
                symbol=symbol,
                price=float(price),
                currency="USD",
                date=date,
                source="coingecko",
                success=True
            )
            
        except Exception as e:
            logger.error(f"CoinGecko error for {symbol}: {str(e)}")
            return PriceData(
                symbol=symbol,
                price=0.0,
                currency="USD",
                date=datetime.now().strftime("%Y-%m-%d"),
                source="coingecko",
                success=False,
                error=str(e)
            )
    
    def _search_coin_id(self, symbol: str) -> Optional[str]:
        """Busca coin ID por símbolo"""
        try:
            url = f"{self.base_url}/search"
            params = {"query": symbol}
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data.get("coins"):
                # Buscar coincidencia exacta por símbolo
                for coin in data["coins"]:
                    if coin.get("symbol", "").upper() == symbol.upper():
                        return coin["id"]
                # Si no hay coincidencia exacta, retornar el primero
                return data["coins"][0]["id"]
        except Exception as e:
            logger.warning(f"Error searching coin ID for {symbol}: {str(e)}")
        return None



