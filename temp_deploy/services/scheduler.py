from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

class CampaignScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()

    def schedule_campaign(self, campaign_id: int, frequency: str, callback):
        """
        Schedule a campaign to run automatically

        Args:
            campaign_id: The campaign ID
            frequency: 'daily', 'weekly', or 'monthly'
            callback: The function to call when the campaign runs
        """
        job_id = f"campaign_{campaign_id}"

        # Remove existing job if any
        self.remove_campaign(campaign_id)

        if frequency == 'daily':
            trigger = CronTrigger(hour=9, minute=0)  # Run daily at 9 AM
        elif frequency == 'weekly':
            trigger = CronTrigger(day_of_week='mon', hour=9, minute=0)  # Run every Monday at 9 AM
        elif frequency == 'monthly':
            trigger = CronTrigger(day=1, hour=9, minute=0)  # Run on 1st of month at 9 AM
        else:
            raise ValueError(f"Invalid frequency: {frequency}")

        self.scheduler.add_job(
            callback,
            trigger=trigger,
            id=job_id,
            args=[campaign_id],
            replace_existing=True
        )

        return True

    def remove_campaign(self, campaign_id: int):
        """Remove a scheduled campaign"""
        job_id = f"campaign_{campaign_id}"
        try:
            self.scheduler.remove_job(job_id)
            return True
        except:
            return False

    def get_scheduled_jobs(self):
        """Get all scheduled jobs"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'next_run': job.next_run_time.isoformat() if job.next_run_time else None
            })
        return jobs

    def shutdown(self):
        """Shutdown the scheduler"""
        self.scheduler.shutdown()
