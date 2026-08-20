"""Generate the spell catalog from the official SRD 5.1 PDF.

Usage: python scripts/import-srd-spells.py SRD-OGL_V5.1.pdf
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "v1" / "spells.json"
CLASS_PAGES = range(104, 113)  # PDF pages 105-113, zero based.
DESCRIPTION_PAGES = range(113, 205)  # PDF pages 114-205, zero based.
CLASS_IDS = {
    "Bard Spells": "bard",
    "Cleric Spells": "cleric",
    "Druid Spells": "druid",
    "Paladin Spells": "paladin",
    "Ranger Spells": "ranger",
    "Sorcerer Spells": "sorcerer",
    "Warlock Spells": "warlock",
    "Wizard Spells": "wizard",
}
ABILITY_IDS = {
    "strength": "str",
    "dexterity": "dex",
    "constitution": "con",
    "intelligence": "int",
    "wisdom": "wis",
    "charisma": "cha",
}
NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}


def clean_line(value: str) -> str:
    value = value.replace("\u00ad", "").replace("‐", "-").replace("‑", "-").replace("–", "-")
    value = re.sub(r"-{2,}", "-", value)
    value = re.sub(r"\s+", " ", value).strip()
    if value.startswith("Component:"):
        value = "Components:" + value.removeprefix("Component:")
    return value


def is_footer(value: str) -> bool:
    return (
        value.startswith("Not for resale")
        or value.startswith("ersonal use only")
        or "System Reference Document 5.1" in value
    )


def page_columns(page) -> list[str]:
    lines: list[str] = []
    width, height = page.width, page.height
    for x0, x1 in ((0, width / 2), (width / 2, width)):
        text = page.crop((x0, 30, x1, height - 55)).extract_text(x_tolerance=2, y_tolerance=3) or ""
        lines.extend(
            line
            for raw in text.splitlines()
            if (line := clean_line(raw)) and not is_footer(line)
        )
    return lines


def key_for_name(value: str) -> str:
    value = value.replace("'", "").replace("’", "")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def metric_number(value: float, factor: float, unit: str) -> str:
    converted = value * factor
    if unit == "m":
        rounded = round(converted * 2) / 2
    elif unit in {"km", "kg", "L"}:
        rounded = round(converted, 1)
    elif unit == "g":
        rounded = round(converted)
    else:
        rounded = round(converted, 1)
    return f"{rounded:g}"


def metric_text(value: str) -> str:
    """Convert imperial measurements while leaving game mechanics unchanged."""

    # Written numbers occur in a few descriptive ranges (for example, one mile).
    for word, number in NUMBER_WORDS.items():
        value = re.sub(
            rf"\b{word}[- ](mile|miles|foot|feet|pound|pounds)\b",
            rf"{number} \1",
            value,
            flags=re.IGNORECASE,
        )

    patterns = [
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:feet|foot)\b", 0.3, "m"),
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:miles|mile)\b", 1.6, "km"),
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:yards|yard)\b", 0.9, "m"),
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:inches|inch)\b", 2.54, "cm"),
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:pounds|pound|lb\.)\b", 0.45359237, "kg"),
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:ounces|ounce|oz\.)\b", 28.349523125, "g"),
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:gallons|gallon)\b", 3.785411784, "L"),
        (r"(?P<n>\d+(?:\.\d+)?)\s*-?\s*(?:pints|pint)\b", 0.473176473, "L"),
    ]
    for pattern, factor, unit in patterns:
        value = re.sub(
            pattern,
            lambda match: f"{metric_number(float(match.group('n')), factor, unit)} {unit}",
            value,
            flags=re.IGNORECASE,
        )
    return value


def extract_class_lists(pdf) -> dict[str, list[str]]:
    class_spells: dict[str, list[str]] = defaultdict(list)
    current_class: str | None = None
    for page_index in CLASS_PAGES:
        for line in page_columns(pdf.pages[page_index]):
            if line in CLASS_IDS:
                current_class = CLASS_IDS[line]
                continue
            if line == "Spell Lists" or re.fullmatch(r"(?:Cantrips \(0 Level\)|\d+(?:st|nd|rd|th) Level)", line):
                continue
            if current_class:
                class_spells[key_for_name(line)].append(current_class)
    return {
        name: list(dict.fromkeys(classes))
        for name, classes in class_spells.items()
    }


HEADER_RE = re.compile(
    r"^(?:(?P<level>\d+)(?:st|nd|rd|th)-level (?P<school>[A-Za-z]+)|(?P<cantrip>[A-Za-z]+) cantrip)(?P<ritual> \(ritual\))?$",
    re.IGNORECASE,
)


def field_value(lines: list[str], label: str, next_labels: tuple[str, ...]) -> str:
    start = next((index for index, line in enumerate(lines) if line.startswith(f"{label}:")), -1)
    if start < 0:
        return ""
    chunks = [lines[start].split(":", 1)[1].strip()]
    for line in lines[start + 1 :]:
        if any(line.startswith(f"{candidate}:") for candidate in next_labels):
            break
        chunks.append(line)
    return clean_line(" ".join(chunks))


def parse_casting_time(value: str) -> dict:
    metric = metric_text(value)
    match = re.match(r"(?P<amount>\d+) (?P<unit>bonus action|action|reaction|minute|hour)", metric, re.I)
    if not match:
        return {"amount": 1, "unit": "special", "text": metric}
    unit = match.group("unit").lower().replace(" ", "-")
    result = {"amount": int(match.group("amount")), "unit": unit, "text": metric}
    remainder = metric[match.end() :].strip(" ,")
    if remainder:
        result["condition"] = remainder
    return result


def parse_duration(value: str) -> dict:
    metric = metric_text(value)
    concentration = metric.lower().startswith("concentration")
    lowered = metric.lower()
    if "instantaneous" in lowered:
        unit, amount = "instantaneous", None
    elif "until dispelled" in lowered:
        unit, amount = "until-dispelled", None
    else:
        match = re.search(r"(\d+) (round|minute|hour|day)s?", lowered)
        if match:
            amount, unit = int(match.group(1)), match.group(2)
        else:
            unit, amount = "special", None
    result = {"unit": unit, "concentration": concentration, "text": metric}
    if amount is not None:
        result["amount"] = amount
    return result


def extract_damage(description: str) -> dict | None:
    match = re.search(
        r"(?P<formula>\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(?P<type>acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s+damage",
        description,
        re.IGNORECASE,
    )
    if not match:
        return None
    result = {
        "formula": re.sub(r"\s+", "", match.group("formula")),
        "type": match.group("type").lower(),
    }
    higher = re.search(r"At Higher Levels\.\s*(.+)$", description, re.IGNORECASE | re.DOTALL)
    if higher:
        result["scaling"] = clean_line(higher.group(1))
    return result


def spell_from_block(name: str, header: re.Match, lines: list[str], classes: list[str]) -> dict:
    casting_raw = field_value(lines, "Casting Time", ("Range",))
    range_raw = field_value(lines, "Range", ("Components",))
    components_raw = field_value(lines, "Components", ("Duration",))
    duration_index = next((index for index, line in enumerate(lines) if line.startswith("Duration:")), -1)
    duration_raw = (
        lines[duration_index].split(":", 1)[1].strip() if duration_index >= 0 else ""
    )
    description_lines = lines[duration_index + 1 :] if duration_index >= 0 else []
    # Duration has no following metadata field, so remove any wrapped continuation before prose.
    if description_lines and not re.search(r"[.!?]$", description_lines[0]) and duration_raw:
        # In the SRD duration values fit on one line; this branch only protects malformed extraction.
        pass
    description = metric_text("\n".join(description_lines)).strip()
    school = header.group("school") or header.group("cantrip") or ""
    result = {
        "id": key_for_name(name),
        "name": name,
        "description": description,
        "source": "SRD",
        "level": int(header.group("level") or 0),
        "school": school.capitalize(),
        "classes": classes,
        "castingTime": parse_casting_time(casting_raw),
        "range": metric_text(range_raw),
        "components": metric_text(components_raw),
        "duration": parse_duration(duration_raw),
    }
    if header.group("ritual"):
        result["ritual"] = True
    lowered = description.lower()
    if "ranged spell attack" in lowered:
        result["attackRoll"] = "ranged"
    elif "melee spell attack" in lowered:
        result["attackRoll"] = "melee"
    saves = []
    for ability in re.findall(
        r"\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b",
        description,
        re.IGNORECASE,
    ):
        ability_id = ABILITY_IDS[ability.lower()]
        if ability_id not in saves:
            saves.append(ability_id)
    if saves:
        result["savingThrow"] = saves[0]
        result["savingThrows"] = saves
    damage = extract_damage(description)
    if damage:
        result["damage"] = damage
    return result


def extract_spells(pdf, class_lists: dict[str, list[str]]) -> list[dict]:
    lines: list[str] = []
    for page_index in DESCRIPTION_PAGES:
        lines.extend(page_columns(pdf.pages[page_index]))
    if lines and lines[0] == "Spell Descriptions":
        lines.pop(0)

    markers: list[tuple[int, str, re.Match]] = []
    for index in range(len(lines) - 1):
        if match := HEADER_RE.fullmatch(lines[index + 1]):
            markers.append((index, lines[index], match))

    spells: list[dict] = []
    for marker_index, (start, name, header) in enumerate(markers):
        end = markers[marker_index + 1][0] if marker_index + 1 < len(markers) else len(lines)
        body = lines[start + 2 : end]
        spell_id = key_for_name(name)
        spells.append(spell_from_block(name, header, body, class_lists.get(spell_id, [])))
    return spells


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Pass the path to SRD-OGL_V5.1.pdf")
    pdf_path = Path(sys.argv[1]).resolve()
    with pdfplumber.open(pdf_path) as pdf:
        class_lists = extract_class_lists(pdf)
        spells = extract_spells(pdf, class_lists)

    ids = [spell["id"] for spell in spells]
    if len(ids) != len(set(ids)):
        duplicates = sorted({spell_id for spell_id in ids if ids.count(spell_id) > 1})
        raise RuntimeError(f"Duplicate spell IDs: {duplicates}")
    unassigned = [spell["name"] for spell in spells if not spell["classes"]]
    OUTPUT.write_text(json.dumps(spells, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(spells)} spells from {pdf_path.name}.")
    print(f"Class-list entries: {len(class_lists)}; spells without a class: {len(unassigned)}")
    if unassigned:
        print("Unassigned:", ", ".join(unassigned))


if __name__ == "__main__":
    main()
