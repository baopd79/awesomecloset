"""Pillow-based collage generation. Pure async function — no service state needed."""

import io

from loguru import logger
from PIL import Image

from backend.core.storage import StorageClient
from backend.outfits.models import OutfitItemRole

CELL = 200
COLS = 3
BUCKET = "closet-images"

# Role → zone index: 0=tops, 1=bottoms, 2=accessories
_ROLE_ZONE: dict[OutfitItemRole, int] = {
    OutfitItemRole.top: 0,
    OutfitItemRole.outerwear: 0,
    OutfitItemRole.bottom: 1,
    OutfitItemRole.shoes: 2,
    OutfitItemRole.bag: 2,
    OutfitItemRole.accessory: 2,
}


async def generate_collage(
    role_paths: list[tuple[OutfitItemRole, str | None]],
    storage: StorageClient,
) -> bytes:
    """
    Build a role-based collage from item thumbnail paths.
    Layout: row 0 = tops/outerwear, row 1 = bottoms, row 2 = shoes/bags/accessories.
    Empty zones are omitted. Canvas width is fixed at COLS×CELL; height = non-empty zones × CELL.
    """
    zones: list[list[str | None]] = [[], [], []]
    for role, path in role_paths:
        zones[_ROLE_ZONE[role]].append(path)

    active_zones = [z for z in zones if z]
    if not active_zones:
        active_zones = [[p for _, p in role_paths]]

    canvas_w = COLS * CELL
    canvas_h = len(active_zones) * CELL
    canvas = Image.new("RGB", (canvas_w, canvas_h), (255, 255, 255))

    for row_idx, zone_paths in enumerate(active_zones):
        n = min(len(zone_paths), COLS)
        x_start = ((COLS - n) * CELL) // 2
        for col_idx, path in enumerate(zone_paths[:COLS]):
            x = x_start + col_idx * CELL
            y = row_idx * CELL
            if path:
                try:
                    data = await storage.download(BUCKET, path)
                    img = Image.open(io.BytesIO(data))
                    cell = _fit_on_white(img, CELL, CELL)
                    canvas.paste(cell, (x, y))
                except Exception as exc:
                    logger.warning("collage cell download failed path={} error={}", path, exc)

    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


def _fit_on_white(img: Image.Image, w: int, h: int) -> Image.Image:
    """Resize img to fit within w×h and composite on a white background."""
    cell = Image.new("RGB", (w, h), (255, 255, 255))
    img.thumbnail((w, h), Image.LANCZOS)
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        cell.paste(rgba, ((w - rgba.width) // 2, (h - rgba.height) // 2), rgba)
    else:
        rgb = img.convert("RGB")
        cell.paste(rgb, ((w - rgb.width) // 2, (h - rgb.height) // 2))
    return cell
