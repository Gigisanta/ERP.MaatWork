"""
Rate limiting utilities
"""

import time
from typing import Dict, Optional
from collections import defaultdict


class RateLimiter:
    """
    Simple rate limiter for API calls
    """
    
    def __init__(self, max_calls: int, period: float):
        """
        Args:
            max_calls: Maximum number of calls allowed
            period: Time period in seconds
        """
        self.max_calls = max_calls
        self.period = period
        self.calls: Dict[str, list] = defaultdict(list)
    
    def wait_if_needed(self, key: str = "default") -> None:
        """
        Wait if rate limit would be exceeded
        
        Args:
            key: Rate limit key (for different endpoints)
        """
        now = time.time()
        # Remove old calls outside the period
        self.calls[key] = [call_time for call_time in self.calls[key] 
                          if now - call_time < self.period]
        
        if len(self.calls[key]) >= self.max_calls:
            # Need to wait until oldest call expires
            oldest_call = min(self.calls[key])
            wait_time = self.period - (now - oldest_call) + 0.1
            if wait_time > 0:
                time.sleep(wait_time)
                # Clean up again after waiting
                now = time.time()
                self.calls[key] = [call_time for call_time in self.calls[key] 
                                  if now - call_time < self.period]
        
        # Record this call
        self.calls[key].append(time.time())




