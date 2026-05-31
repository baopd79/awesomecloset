from backend.items.models import ClothingOccasion, ClothingSeason, ClothingStyle, ClothingType

_TYPES = [e.value for e in ClothingType]
_STYLES = [e.value for e in ClothingStyle]
_SEASONS = [e.value for e in ClothingSeason]
_OCCASIONS = [e.value for e in ClothingOccasion]

TAGGING_PROMPT = f"""\
Analyze the clothing item in the image. Return a JSON object with exactly these fields:

"type": one value from {_TYPES}
"colors": array of 1-3 dominant colors, each as {{"hex": "#RRGGBB", "name": "color name in English"}}
"style": array of applicable values from {_STYLES}
"season": array of applicable values from {_SEASONS}
"occasion": array of applicable values from {_OCCASIONS}

Rules:
- Use only the exact string values listed above for type, style, season, and occasion.
- Every field is required. Arrays must contain at least one item.
- Return only the JSON object, no explanation or markdown.\
"""
