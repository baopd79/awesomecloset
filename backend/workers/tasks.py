from arq import func
from loguru import logger


async def _process_item(ctx: dict, item_id: str) -> None:
    """Main processing pipeline for a clothing item. ctx carries shared resources initialized in WorkerSettings.on_startup."""
    job_try = ctx.get("job_try", 1)
    logger.info(f"process_item start | job_id={ctx['job_id']} item_id={item_id} try={job_try}")

    # Task 5: rembg background removal pipeline
    # Task 8: Gemini Vision tagging pipeline


# func() wraps the coroutine so ARQ can serialize/deserialize it as a named job.
process_item = func(_process_item, name="process_item", max_tries=3)
