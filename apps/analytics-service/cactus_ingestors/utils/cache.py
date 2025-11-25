"""
Cache utilities
"""

from typing import Optional, Dict, Any
import time
from functools import wraps


class SimpleCache:
    """
    Simple in-memory cache with TTL
    """
    
    def __init__(self, default_ttl: int = 300):
        """
        Args:
            default_ttl: Default TTL in seconds
        """
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        if key not in self.cache:
            return None
        
        value, expire_time = self.cache[key]
        if time.time() > expire_time:
            del self.cache[key]
            return None
        
        return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: TTL in seconds (uses default if None)
        """
        ttl = ttl or self.default_ttl
        expire_time = time.time() + ttl
        self.cache[key] = (value, expire_time)
    
    def clear(self) -> None:
        """Clear all cached values"""
        self.cache.clear()
    
    def invalidate(self, key: str) -> None:
        """Invalidate specific key"""
        if key in self.cache:
            del self.cache[key]


def cached(ttl: int = 300):
    """
    Decorator for caching function results
    
    Args:
        ttl: TTL in seconds
    """
    def decorator(func):
        cache = SimpleCache(ttl)
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from args and kwargs
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            cached_value = cache.get(key)
            if cached_value is not None:
                return cached_value
            
            result = func(*args, **kwargs)
            cache.set(key, result, ttl)
            return result
        
        wrapper.cache_clear = cache.clear
        wrapper.cache_invalidate = cache.invalidate
        return wrapper
    return decorator




