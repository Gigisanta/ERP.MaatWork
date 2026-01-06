"""CoinCap provider - API pública sin key requerida (fallback crypto)"""
import requests
from typing import Optional
from datetime import datetime
import logging
from . import PriceData

logger = logging.getLogger(__name__)


class CoinCapProvider:
    """Provider para CoinCap API (crypto fallback)"""
    
    name = "CoinCap"
    base_url = "https://api.coincap.io/v2"
    
    # Mapeo de símbolos comunes a IDs de CoinCap
    SYMBOL_MAP = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "USDT": "tether",
        "BNB": "binance-coin",
        "SOL": "solana",
        "ADA": "cardano",
        "DOGE": "dogecoin",
        "XRP": "xrp",
        "DOT": "polkadot",
        "MATIC": "polygon",
        "AVAX": "avalanche",
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
        "THETA": "theta-network",
        "ICP": "internet-computer",
        "HBAR": "hedera-hashgraph",
        "NEAR": "near-protocol",
        "APT": "aptos",
        "ARB": "arbitrum",
        "OP": "optimism",
    }
    
    def fetch_price(self, symbol: str) -> PriceData:
        """Obtiene precio actual de CoinCap"""
        try:
            # Convertir símbolo a ID de CoinCap
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
                    source="coincap",
                    success=False,
                    error=f"Coin ID not found for {symbol}"
                )
            
            # Fetch precio
            url = f"{self.base_url}/assets/{coin_id}"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if "data" not in data:
                raise ValueError(f"No data for {coin_id}")
            
            asset_data = data["data"]
            price = float(asset_data["priceUsd"])
            
            return PriceData(
                symbol=symbol,
                price=price,
                currency="USD",
                date=datetime.now().strftime("%Y-%m-%d"),
                source="coincap",
                success=True
            )
            
        except Exception as e:
            logger.error(f"CoinCap error for {symbol}: {str(e)}")
            return PriceData(
                symbol=symbol,
                price=0.0,
                currency="USD",
                date=datetime.now().strftime("%Y-%m-%d"),
                source="coincap",
                success=False,
                error=str(e)
            )
    
    def _search_coin_id(self, symbol: str) -> Optional[str]:
        """Busca coin ID por símbolo"""
        try:
            url = f"{self.base_url}/assets"
            params = {"search": symbol, "limit": 5}
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data.get("data"):
                # Buscar coincidencia exacta por símbolo
                for asset in data["data"]:
                    if asset.get("symbol", "").upper() == symbol.upper():
                        return asset["id"]
                # Si no hay coincidencia exacta, retornar el primero
                return data["data"][0]["id"]
        except Exception as e:
            logger.warning(f"Error searching coin ID for {symbol}: {str(e)}")
        return None



