from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "icons"
SCALE = 4


def render_icon(size: int, *, maskable: bool = False) -> Image.Image:
    px = size * SCALE
    image = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    inset = 0 if maskable else round(px * 0.035)
    radius = 0 if maskable else round(px * 0.19)

    top = (40, 119, 173)
    bottom = (18, 72, 111)
    for y in range(inset, px - inset):
        ratio = (y - inset) / max(1, px - inset * 2 - 1)
        color = tuple(round(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3)) + (255,)
        draw.line((inset, y, px - inset - 1, y), fill=color)

    if radius:
        mask = Image.new("L", (px, px), 0)
        ImageDraw.Draw(mask).rounded_rectangle((inset, inset, px - inset - 1, px - inset - 1), radius=radius, fill=255)
        image.putalpha(mask)

    # La marca mantiene todo el detalle dentro de la zona segura de iconos adaptativos.
    center = px / 2
    width = px * (0.48 if maskable else 0.55)
    left, right = center - width / 2, center + width / 2
    roof_y, wall_y, floor_y = px * 0.32, px * 0.47, px * 0.73
    stroke = round(px * 0.047)
    white = (255, 255, 255, 255)

    draw.line((left, wall_y, center, roof_y, right, wall_y), fill=white, width=stroke, joint="curve")
    draw.line((left + px * 0.035, wall_y - px * 0.012, left + px * 0.035, floor_y), fill=white, width=stroke)
    draw.line((right - px * 0.035, wall_y - px * 0.012, right - px * 0.035, floor_y), fill=white, width=stroke)
    draw.line((left - px * 0.045, floor_y, right + px * 0.045, floor_y), fill=white, width=stroke)

    door_left, door_right = center - px * 0.085, center + px * 0.085
    door_top = px * 0.565
    draw.line((door_left, floor_y, door_left, door_top, door_right, door_top, door_right, floor_y), fill=white, width=stroke)

    window_r = px * 0.024
    for x in (left + width * 0.28, right - width * 0.28):
        draw.ellipse((x - window_r, px * 0.51 - window_r, x + window_r, px * 0.51 + window_r), fill=white)

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    render_icon(192).save(OUTPUT / "icon-192.png", optimize=True)
    render_icon(512).save(OUTPUT / "icon-512.png", optimize=True)
    render_icon(512, maskable=True).save(OUTPUT / "icon-maskable-512.png", optimize=True)
    render_icon(180).convert("RGB").save(OUTPUT / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    main()
