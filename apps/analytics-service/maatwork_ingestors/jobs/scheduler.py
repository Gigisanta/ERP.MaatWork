"""
APScheduler job scheduler for data ingestion
"""

import logging
import os
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


class IngestionScheduler:
    """
    Scheduler for data ingestion jobs
    """

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.timezone = os.getenv("TZ", "America/Argentina/Buenos_Aires")

    def add_job(self, func, trigger, id: str, **kwargs):
        """
        Add a scheduled job

        Args:
            func: Function to call
            trigger: APScheduler trigger
            id: Job ID
            **kwargs: Additional job arguments
        """
        self.scheduler.add_job(
            func, trigger=trigger, id=id, timezone=self.timezone, **kwargs
        )
        logger.info(f"Added job: {id}")

    def start(self):
        """Start the scheduler"""
        self.scheduler.start()
        logger.info("Scheduler started")

    def stop(self):
        """Stop the scheduler"""
        self.scheduler.shutdown()
        logger.info("Scheduler stopped")

    def get_jobs(self):
        """Get all scheduled jobs"""
        return self.scheduler.get_jobs()


# Global scheduler instance
_scheduler: IngestionScheduler | None = None


def get_scheduler() -> IngestionScheduler:
    """Get global scheduler instance"""
    global _scheduler
    if _scheduler is None:
        _scheduler = IngestionScheduler()
    return _scheduler
