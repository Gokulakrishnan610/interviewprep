# Background task registry.
# Import here so callers only need: from app.tasks import schedule_report

from app.tasks.report_tasks import (  # noqa: F401
    generate_report_task,
    get_report_status,
    schedule_report,
)
