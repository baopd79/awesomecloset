from arq import func
from loguru import logger


async def _process_item(ctx: dict, item_id: str) -> None:
    job_try = ctx.get("job_try", 1)
    logger.info(f"process_item start | job_id={ctx['job_id']} item_id={item_id} try={job_try}")

    # Task 5: rembg background removal pipeline
    # Task 8: Gemini Vision tagging pipeline


process_item = func(_process_item, name="process_item", max_tries=3)
