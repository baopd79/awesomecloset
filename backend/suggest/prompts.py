"""Gemini outfit-suggestion prompt. Taxonomy values are passed explicitly so the model
picks existing closet items by id rather than inventing garments or tags."""

import json
from typing import Any

MIN_OUTFITS = 2
MAX_OUTFITS = 3


def build_suggestion_prompt(
    *,
    closet: list[dict[str, Any]],
    weather: dict[str, Any] | None,
    occasion: str | None,
    recent_item_ids: list[str],
) -> str:
    closet_json = json.dumps(closet, ensure_ascii=False)
    weather_line = (
        f'{weather["temp_c"]}°C, {weather["condition"]}' if weather else "không có dữ liệu"
    )
    occasion_line = occasion or "bất kỳ"
    recent_line = json.dumps(recent_item_ids) if recent_item_ids else "[]"

    return f"""\
Bạn là stylist cá nhân. Chọn outfit từ tủ đồ có sẵn dưới đây.

Tủ đồ (mỗi món có id và tags):
{closet_json}

Bối cảnh:
- Thời tiết: {weather_line}
- Hoàn cảnh: {occasion_line}
- Các item_id đã mặc gần đây (ưu tiên TRÁNH lặp lại): {recent_line}

Yêu cầu:
- Trả về {MIN_OUTFITS}-{MAX_OUTFITS} outfit, mỗi outfit gồm 3-5 món.
- Chỉ dùng `item_id` có trong tủ đồ ở trên — KHÔNG bịa id mới.
- Mỗi outfit nên có ít nhất 1 top hoặc 1 bottom, hợp thời tiết và hoàn cảnh.
- `reasoning`: 1 câu tiếng Việt ngắn gọn giải thích vì sao hợp (vd "Trời 22°C, áo này vừa ấm vừa lịch sự").

Trả về JSON đúng schema này, không kèm giải thích hay markdown:
{{"outfits": [{{"item_ids": ["<uuid>", ...], "reasoning": "<text>"}}]}}\
"""
