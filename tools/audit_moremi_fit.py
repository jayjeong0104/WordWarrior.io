"""Render and measure the proven Moremi equipment catalog.

The rejected Starlight set is deliberately excluded.  The generated matrices
use the same 120x120 canvas, layer order, and right-hand mirroring as the web
client, so they can be used as fit references for future cosmetics.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps


CANVAS_SIZE = 120
REJECTED_IDS: set[str] = set()
UNREGISTERED_IDS = {"nuke2"}
CATEGORIES = ("head", "eye", "mouth", "clothes", "shoes", "hand", "back")
LAYER_ORDER = ("back", "body", "eye", "mouth", "shoes", "clothes", "head", "lhand", "rhand")

FIT_FAMILIES = {
    "top_hat": (
        "blackbere",
        "brownbere",
        "redbere",
        "haksamo",
        "miljip",
        "twoeight",
    ),
    "head_wrap": ("black_mask", "white_mask", "blue_headphone", "orange_headphone"),
    "head_ears": ("hamster_G", "hamster_O", "nekomimi"),
    "upper_clothes": ("blue_vest", "orange_vest", "pink_vest"),
    "lower_clothes": ("pants_china", "pants_japan", "pants_korea", "sqpants"),
    "full_clothes": ("blackrobe", "medal", "water"),
    "compact_shoes": ("black_oxford", "black_shoes", "brown_oxford", "loosesocks"),
    "compact_hand": (
        "bluecandy",
        "choco_ice",
        "lemoncandy",
        "melon_ice",
        "pinkcandy",
        "purple_ice",
    ),
    "tall_hand": ("bokjori", "rio_seonghwa", "spanner", "test"),
}


def load_font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


FONT_12 = load_font(12)
FONT_14 = load_font(14)
FONT_16 = load_font(16)
FONT_20 = load_font(20)


def open_layer(path: Path) -> Image.Image:
    image = Image.open(path)
    try:
        image.seek(0)
    except EOFError:
        pass
    image = image.convert("RGBA")
    if image.size != (CANVAS_SIZE, CANVAS_SIZE):
        image = image.resize((CANVAS_SIZE, CANVAS_SIZE), Image.Resampling.LANCZOS)
    return image


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def alpha_pixels(image: Image.Image) -> int:
    return sum(1 for value in image.getchannel("A").getdata() if value > 0)


def checker(size: tuple[int, int], step: int = 10) -> Image.Image:
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            color = (247, 247, 247) if (x // step + y // step) % 2 == 0 else (226, 229, 234)
            draw.rectangle((x, y, min(size[0] - 1, x + step - 1), min(size[1] - 1, y + step - 1)), fill=color)
    return image


def collect_items(moremi_root: Path) -> dict[str, dict[str, Image.Image]]:
    items: dict[str, dict[str, Image.Image]] = {}
    for category in CATEGORIES:
        category_items: dict[str, Image.Image] = {}
        for path in sorted((moremi_root / category).iterdir()):
            if path.suffix.lower() not in {".png", ".gif"}:
                continue
            if path.stem == "def" or path.stem in REJECTED_IDS or path.stem in UNREGISTERED_IDS:
                continue
            category_items[path.stem] = open_layer(path)
        items[category] = category_items
    return items


def render_moremi(
    moremi_root: Path,
    items: dict[str, dict[str, Image.Image]],
    *,
    back: str | None = None,
    eye: str | None = None,
    mouth: str | None = None,
    shoes: str | None = None,
    clothes: str | None = None,
    head: str | None = None,
    lhand: str | None = None,
    rhand: str | None = None,
) -> Image.Image:
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    if back:
        canvas.alpha_composite(items["back"][back])
    canvas.alpha_composite(open_layer(moremi_root / "body_fla.png"))
    canvas.alpha_composite(items["eye"][eye] if eye else open_layer(moremi_root / "eye/def.png"))
    canvas.alpha_composite(items["mouth"][mouth] if mouth else open_layer(moremi_root / "mouth/def.png"))
    if shoes:
        canvas.alpha_composite(items["shoes"][shoes])
    if clothes:
        canvas.alpha_composite(items["clothes"][clothes])
    if head:
        canvas.alpha_composite(items["head"][head])
    if lhand:
        canvas.alpha_composite(items["hand"][lhand])
    if rhand:
        canvas.alpha_composite(ImageOps.mirror(items["hand"][rhand]))
    return canvas


def draw_centered(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, font: ImageFont.ImageFont, fill=(37, 47, 64)) -> None:
    left, top, right, bottom = box
    bounds = draw.textbbox((0, 0), text, font=font)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    draw.text((left + (right - left - width) / 2, top + (bottom - top - height) / 2), text, font=font, fill=fill)


def render_single_item_sheet(moremi_root: Path, items: dict[str, dict[str, Image.Image]], out_path: Path) -> None:
    entries = [(category, item_id) for category in CATEGORIES for item_id in items[category]]
    cols = 5
    cell_w, cell_h = 188, 178
    rows = math.ceil(len(entries) / cols)
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), (234, 239, 247))
    draw = ImageDraw.Draw(sheet)
    for index, (category, item_id) in enumerate(entries):
        x = (index % cols) * cell_w
        y = (index // cols) * cell_h
        draw.rounded_rectangle((x + 5, y + 5, x + cell_w - 5, y + cell_h - 5), radius=10, fill="white", outline=(199, 207, 219))
        sprite_bg = checker((120, 120), 12)
        if category == "hand":
            avatar = render_moremi(moremi_root, items, rhand=item_id)
        else:
            avatar = render_moremi(moremi_root, items, **{category: item_id})
        sprite_bg.paste(avatar, (0, 0), avatar)
        sheet.paste(sprite_bg, (x + 34, y + 10))
        draw_centered(draw, (x + 8, y + 136, x + cell_w - 8, y + 158), f"{category} / {item_id}", FONT_12)
        bbox = alpha_bbox(items[category][item_id])
        draw_centered(draw, (x + 8, y + 156, x + cell_w - 8, y + 174), f"bbox {bbox}", FONT_12, (92, 101, 116))
    sheet.save(out_path, optimize=True)


def matrix_states(category: str, items: dict[str, dict[str, Image.Image]]) -> list[str | None]:
    return [None, *items[category].keys()]


def render_pair_matrix(
    moremi_root: Path,
    items: dict[str, dict[str, Image.Image]],
    column_category: str,
    row_category: str,
    out_path: Path,
) -> None:
    columns = matrix_states(column_category, items)
    rows = matrix_states(row_category, items)
    label_w, label_h = 132, 76
    cell_w, cell_h = 120, 142
    sheet = Image.new("RGB", (label_w + len(columns) * cell_w, label_h + len(rows) * cell_h), (235, 239, 246))
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((0, 0, sheet.width - 1, sheet.height - 1), outline=(180, 188, 200))
    draw_centered(draw, (0, 0, label_w, label_h), f"{row_category} × {column_category}", FONT_16)
    for col, state in enumerate(columns):
        draw_centered(draw, (label_w + col * cell_w + 2, 0, label_w + (col + 1) * cell_w - 2, label_h), state or "default", FONT_12)
    for row, row_state in enumerate(rows):
        draw_centered(draw, (2, label_h + row * cell_h, label_w - 2, label_h + (row + 1) * cell_h), row_state or "default", FONT_12)
        for col, col_state in enumerate(columns):
            kwargs = {column_category: col_state, row_category: row_state}
            if column_category == "hand":
                kwargs.pop("hand")
                kwargs["rhand"] = col_state
            if row_category == "hand":
                kwargs.pop("hand")
                kwargs["rhand"] = row_state
            avatar = render_moremi(moremi_root, items, **kwargs)
            background = checker((120, 120), 12)
            background.paste(avatar, (0, 0), avatar)
            x = label_w + col * cell_w
            y = label_h + row * cell_h
            sheet.paste(background, (x, y))
            draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), outline=(205, 211, 220))
            draw_centered(draw, (x + 2, y + 121, x + cell_w - 2, y + cell_h - 2), f"{row + 1}.{col + 1}", FONT_12, (102, 110, 124))
    sheet.save(out_path, optimize=True)


def quantile(values: list[int], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return float(ordered[lower])
    return ordered[lower] * (upper - position) + ordered[upper] * (position - lower)


def bbox_summary(images: Iterable[Image.Image]) -> dict[str, object]:
    boxes = [box for image in images if (box := alpha_bbox(image))]
    if not boxes:
        return {"count": 0, "union": None, "median": None, "p10": None, "p90": None}
    coordinates = list(zip(*boxes))
    return {
        "count": len(boxes),
        "union": [min(coordinates[0]), min(coordinates[1]), max(coordinates[2]), max(coordinates[3])],
        "median": [round(quantile(list(values), 0.5), 2) for values in coordinates],
        "p10": [round(quantile(list(values), 0.1), 2) for values in coordinates],
        "p90": [round(quantile(list(values), 0.9), 2) for values in coordinates],
    }


def render_geometry_sheet(moremi_root: Path, items: dict[str, dict[str, Image.Image]], report: dict[str, object], out_path: Path) -> None:
    panels = (
        ("HEAD FIT FAMILIES", "head", (("top_hat", (73, 111, 255, 128)), ("head_wrap", (137, 86, 217, 105)), ("head_ears", (232, 96, 151, 105)))),
        ("CLOTHES FIT FAMILIES", "clothes", (("upper_clothes", (210, 77, 134, 135)), ("lower_clothes", (255, 153, 51, 145)), ("full_clothes", (137, 86, 217, 85)))),
        ("SHOES FIT FAMILY", "shoes", (("compact_shoes", (255, 134, 36, 165)),)),
        ("HAND FIT FAMILIES", "hand", (("compact_hand", (59, 173, 140, 145)), ("tall_hand", (73, 111, 255, 110)))),
    )
    panel_w, panel_h = 500, 470
    sheet = Image.new("RGB", (panel_w * 2, panel_h * 2), (237, 241, 247))
    draw = ImageDraw.Draw(sheet)
    body = open_layer(moremi_root / "body_fla.png")
    by_id = {item_id: image for category_items in items.values() for item_id, image in category_items.items()}

    def merged_alpha(ids: Iterable[str]) -> Image.Image:
        merged = bytearray(CANVAS_SIZE * CANVAS_SIZE)
        for item_id in ids:
            alpha = by_id[item_id].getchannel("A").tobytes()
            for offset, value in enumerate(alpha):
                if value > merged[offset]:
                    merged[offset] = value
        return Image.frombytes("L", (CANVAS_SIZE, CANVAS_SIZE), bytes(merged))

    for index, (title, category, families) in enumerate(panels):
        px = (index % 2) * panel_w
        py = (index // 2) * panel_h
        draw.rounded_rectangle((px + 8, py + 8, px + panel_w - 8, py + panel_h - 8), radius=12, fill="white", outline=(200, 207, 218))
        draw.text((px + 22, py + 18), title, font=FONT_20, fill=(33, 43, 61))
        stage = checker((240, 240), 20).convert("RGBA")
        stage.alpha_composite(body.resize((240, 240), Image.Resampling.NEAREST))
        for family, color in families:
            union = merged_alpha(FIT_FAMILIES[family])
            overlay = Image.new("RGBA", (120, 120), color)
            overlay.putalpha(union.point(lambda value, cap=color[3]: min(cap, max(0, value // 2))))
            stage.alpha_composite(overlay.resize((240, 240), Image.Resampling.NEAREST))
        stage_draw = ImageDraw.Draw(stage)
        for coord in range(0, 241, 20):
            stage_draw.line((coord, 0, coord, 240), fill=(70, 82, 100, 55))
            stage_draw.line((0, coord, 240, coord), fill=(70, 82, 100, 55))
        sheet.paste(stage.convert("RGB"), (px + 130, py + 56))
        text_y = py + 310
        for family_index, (family, color) in enumerate(families):
            summary = report["fit_families"][family]
            line_y = text_y + family_index * 42
            draw.rounded_rectangle((px + 22, line_y + 2, px + 34, line_y + 14), radius=2, fill=color[:3])
            draw.text((px + 42, line_y), f"{family}: union {summary['union']}", font=FONT_14, fill=(50, 61, 80))
            draw.text((px + 42, line_y + 21), f"median bbox {summary['median']}", font=FONT_12, fill=(87, 97, 113))
        category_summary = report["categories"][category]
        draw.text((px + 22, py + panel_h - 32), f"{category_summary['count']} proven store items · 120×120 shared canvas", font=FONT_12, fill=(105, 114, 129))
    sheet.save(out_path, optimize=True)


def render_full_loadouts(moremi_root: Path, items: dict[str, dict[str, Image.Image]], out_path: Path) -> None:
    category_lists = {category: list(items[category]) for category in CATEGORIES}
    count = max(len(values) for values in category_lists.values())
    cols = 3
    cell_w, cell_h = 320, 270
    sheet = Image.new("RGB", (cols * cell_w, math.ceil(count / cols) * cell_h), (233, 238, 246))
    draw = ImageDraw.Draw(sheet)
    steps = {"head": 1, "eye": 5, "mouth": 3, "clothes": 7, "shoes": 3, "hand": 7, "back": 5}
    offsets = {"head": 0, "eye": 1, "mouth": 2, "clothes": 3, "shoes": 0, "hand": 4, "back": 2}
    for index in range(count):
        chosen = {}
        for category, values in category_lists.items():
            chosen[category] = values[(index * steps[category] + offsets[category]) % len(values)]
        avatar = render_moremi(
            moremi_root,
            items,
            back=chosen["back"],
            eye=chosen["eye"],
            mouth=chosen["mouth"],
            shoes=chosen["shoes"],
            clothes=chosen["clothes"],
            head=chosen["head"],
            rhand=chosen["hand"],
        )
        x = (index % cols) * cell_w
        y = (index // cols) * cell_h
        draw.rounded_rectangle((x + 6, y + 6, x + cell_w - 6, y + cell_h - 6), radius=12, fill="white", outline=(197, 205, 218))
        bg = checker((168, 168), 14)
        scaled = avatar.resize((168, 168), Image.Resampling.NEAREST)
        bg.paste(scaled, (0, 0), scaled)
        sheet.paste(bg, (x + 76, y + 12))
        lines = (
            f"{chosen['head']} | {chosen['eye']} | {chosen['mouth']}",
            f"{chosen['clothes']} | {chosen['shoes']}",
            f"{chosen['hand']} | {chosen['back']}",
        )
        for line_index, line in enumerate(lines):
            draw_centered(draw, (x + 10, y + 185 + line_index * 22, x + cell_w - 10, y + 205 + line_index * 22), line, FONT_12, (63, 73, 91) if line_index == 0 else (84, 94, 111))
        draw_centered(draw, (x + 10, y + 251, x + cell_w - 10, y + 267), f"loadout {index + 1}", FONT_12, (112, 121, 136))
    sheet.save(out_path, optimize=True)


def build_report(moremi_root: Path, items: dict[str, dict[str, Image.Image]]) -> dict[str, object]:
    category_report = {category: bbox_summary(items[category].values()) for category in CATEGORIES}
    item_report = {}
    for category in CATEGORIES:
        item_report[category] = {
            item_id: {
                "bbox": alpha_bbox(image),
                "alpha_pixels": alpha_pixels(image),
                "touches_canvas": {
                    "left": bool(alpha_bbox(image) and alpha_bbox(image)[0] == 0),
                    "top": bool(alpha_bbox(image) and alpha_bbox(image)[1] == 0),
                    "right": bool(alpha_bbox(image) and alpha_bbox(image)[2] == CANVAS_SIZE),
                    "bottom": bool(alpha_bbox(image) and alpha_bbox(image)[3] == CANVAS_SIZE),
                },
            }
            for item_id, image in items[category].items()
        }
    family_report = {}
    by_id = {item_id: image for category in CATEGORIES for item_id, image in items[category].items()}
    for family, ids in FIT_FAMILIES.items():
        family_report[family] = bbox_summary(by_id[item_id] for item_id in ids if item_id in by_id)
    states = {category: len(items[category]) + 1 for category in CATEGORIES}
    states["lhand"] = states.pop("hand")
    states["rhand"] = len(items["hand"]) + 1
    full_combinations = math.prod(states.values())
    pairwise_combinations = 0
    state_values = list(states.values())
    for left in range(len(state_values)):
        for right in range(left + 1, len(state_values)):
            pairwise_combinations += state_values[left] * state_values[right]
    return {
        "canvas": [CANVAS_SIZE, CANVAS_SIZE],
        "layer_order": LAYER_ORDER,
        "rejected_ids": sorted(REJECTED_IDS),
        "unregistered_ids": sorted(UNREGISTERED_IDS),
        "legacy_item_count": sum(len(category_items) for category_items in items.values()),
        "state_counts_including_default": states,
        "full_cartesian_combinations": full_combinations,
        "pairwise_combinations": pairwise_combinations,
        "body_bbox": alpha_bbox(open_layer(moremi_root / "body_fla.png")),
        "categories": category_report,
        "fit_families": family_report,
        "items": item_report,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    moremi_root = args.root / "Server/lib/Web/public/img/kkutu/moremi"
    args.out.mkdir(parents=True, exist_ok=True)
    items = collect_items(moremi_root)
    report = build_report(moremi_root, items)

    render_single_item_sheet(moremi_root, items, args.out / "01-single-items.png")
    render_pair_matrix(moremi_root, items, "head", "eye", args.out / "02-head-eye-matrix.png")
    render_pair_matrix(moremi_root, items, "clothes", "shoes", args.out / "03-clothes-shoes-matrix.png")
    render_pair_matrix(moremi_root, items, "clothes", "hand", args.out / "04-clothes-hand-matrix.png")
    render_pair_matrix(moremi_root, items, "head", "hand", args.out / "05-head-hand-matrix.png")
    render_geometry_sheet(moremi_root, items, report, args.out / "06-fit-geometry.png")
    render_full_loadouts(moremi_root, items, args.out / "07-full-loadouts.png")
    (args.out / "fit-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(args.out.resolve()),
        "legacy_item_count": report["legacy_item_count"],
        "full_cartesian_combinations": report["full_cartesian_combinations"],
        "pairwise_combinations": report["pairwise_combinations"],
    }, indent=2))


if __name__ == "__main__":
    main()
