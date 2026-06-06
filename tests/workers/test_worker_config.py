"""Worker (ARQ) configuration regression guards.

These assertions lock in two non-obvious settings whose removal silently re-introduces a
"stuck item" bug, so they are easy to drop during a refactor without any test failing.
"""

from backend.workers.main import WorkerSettings
from backend.workers.tasks import process_item


def test_process_item_does_not_keep_results():
    # keep_result must be 0. Otherwise ARQ keeps a result:{job_id} key for an hour, and
    # enqueue_job treats that key as "job already exists" — so a retry/recovery reusing the
    # deterministic job id within that hour is silently dropped and the item stalls at pending.
    assert process_item.keep_result_s == 0


def test_orphan_recovery_runs_periodically():
    # Recovery must run on a cron, not only on startup: an item whose job exhausted its retries
    # leaves the queue and would otherwise sit stuck until the next worker restart.
    cron_names = [c.name for c in WorkerSettings.cron_jobs]
    assert any("_recover_orphaned" in name for name in cron_names)
