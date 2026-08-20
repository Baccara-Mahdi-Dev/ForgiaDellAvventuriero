"""Generate all web/PWA icon variants from the transparent brand master."""

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "public" / "brand" / "logo-d20-hammer.png"
ICONS = ROOT / "public" / "icons"
SIZES = (72, 96, 128, 144, 152, 192, 384, 512)
BACKGROUND = (32, 21, 15, 255)


def contain(image: Image.Image, size: int, ratio: float) -> Image.Image:
    target = max(1, round(size * ratio))
    scaled = image.copy()
    scaled.thumbnail((target, target), Image.Resampling.LANCZOS)
    return scaled


def pwa_icon(master: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    inset = max(1, round(size * 0.035))
    draw.rounded_rectangle(
        (inset, inset, size - inset - 1, size - inset - 1),
        radius=round(size * 0.2),
        fill=BACKGROUND,
    )
    mark = contain(master, size, 0.72)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    master = Image.open(MASTER).convert("RGBA")
    for size in SIZES:
        pwa_icon(master, size).save(ICONS / f"icon-{size}x{size}.png", optimize=True)

    favicon = pwa_icon(master, 48)
    favicon.save(
        ROOT / "public" / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )


if __name__ == "__main__":
    main()
