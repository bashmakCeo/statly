from io import BytesIO

from fastapi import HTTPException, status
from PIL import Image

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

MAX_CHANNEL_PICTURE_OUTPUT_BYTES = 5 * 1024 * 1024
MAX_CHANNEL_PICTURE_DIMENSION = 1920


def process_channel_picture(content: bytes) -> bytes:
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid channel picture",
        )

    try:
        image = Image.open(BytesIO(content))
        image = image.convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid channel picture",
        )

    width, height = image.size
    max_dimension = max(width, height)

    if max_dimension > MAX_CHANNEL_PICTURE_DIMENSION:
        scale = MAX_CHANNEL_PICTURE_DIMENSION / max_dimension
        image = image.resize(
            (int(width * scale), int(height * scale)),
            Image.Resampling.LANCZOS,
        )

    quality = 90
    buffer = BytesIO()

    while quality >= 55:
        buffer.seek(0)
        buffer.truncate(0)
        image.save(buffer, format="JPEG", quality=quality, optimize=True)

        if buffer.tell() <= MAX_CHANNEL_PICTURE_OUTPUT_BYTES:
            return buffer.getvalue()

        quality -= 10

    raise HTTPException(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        detail="Channel picture is too large",
    )
