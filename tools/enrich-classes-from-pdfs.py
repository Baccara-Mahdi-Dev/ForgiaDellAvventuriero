"""Enrich classes.json with subclass rules extracted from the three supplied rulebooks.

The script deliberately keeps the original English rules text: subclass names and the
surrounding application remain localized, while the mechanical source remains auditable.
Run it from the repository root and pass the directory containing the three PDFs.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

import pdfplumber


@dataclass(frozen=True)
class Section:
    book: str
    class_id: str
    subclass_id: str
    heading: str
    page: int


SECTIONS = [
    # Player's Handbook
    Section("PHB", "barbarian", "Berserker", "Path of the Berserker", 49),
    Section("PHB", "barbarian", "Guerriero Totemico", "Path of the Totem Warrior", 50),
    Section("PHB", "bard", "Collegio della Sapienza", "College of Lore", 54),
    Section("PHB", "bard", "Collegio del Valore", "College of Valor", 55),
    Section("PHB", "cleric", "Dominio della Conoscenza", "Knowledge Domain", 59),
    Section("PHB", "cleric", "Dominio della Vita", "Life Domain", 60),
    Section("PHB", "cleric", "Dominio della Luce", "Light Domain", 60),
    Section("PHB", "cleric", "Dominio della Natura", "Nature Domain", 61),
    Section("PHB", "cleric", "Dominio della Tempesta", "Tempest Domain", 62),
    Section("PHB", "cleric", "Dominio dell'Inganno", "Trickery Domain", 62),
    Section("PHB", "cleric", "Dominio della Guerra", "War Domain", 63),
    Section("PHB", "druid", "Circolo della Terra", "Circle of the Land", 68),
    Section("PHB", "druid", "Circolo della Luna", "Circle of the Moon", 69),
    Section("PHB", "fighter", "Campione", "Champion", 72),
    Section("PHB", "fighter", "Maestro di Battaglia", "Battle Master", 73),
    Section("PHB", "fighter", "Cavaliere Mistico", "Eldritch Knight", 74),
    Section("PHB", "monk", "Via della Mano Aperta", "Way of the Open Hand", 79),
    Section("PHB", "monk", "Via dell'Ombra", "Way of Shadow", 80),
    Section("PHB", "monk", "Via dei Quattro Elementi", "Way of the Four Elements", 80),
    Section("PHB", "paladin", "Giuramento di Devozione", "Oath of Devotion", 86),
    Section("PHB", "paladin", "Giuramento degli Antichi", "Oath of the Ancients", 87),
    Section("PHB", "paladin", "Giuramento di Vendetta", "Oath of Vengeance", 87),
    Section("PHB", "ranger", "Cacciatore", "Hunter", 93),
    Section("PHB", "ranger", "Signore delle Bestie", "Beast Master", 93),
    Section("PHB", "rogue", "Furfante", "Thief", 97),
    Section("PHB", "rogue", "Assassino", "Assassin", 97),
    Section("PHB", "rogue", "Mistificatore Arcano", "Arcane Trickster", 98),
    Section("PHB", "sorcerer", "Discendenza Draconica", "Draconic Bloodline", 102),
    Section("PHB", "sorcerer", "Magia Selvaggia", "Wild Magic", 103),
    Section("PHB", "warlock", "Il Signore Fatato", "The Archfey", 108),
    Section("PHB", "warlock", "L'Immondo", "The Fiend", 109),
    Section("PHB", "warlock", "Il Grande Antico", "The Great Old One", 110),
    Section("PHB", "wizard", "Scuola di Abiurazione", "School of Abjuration", 116),
    Section("PHB", "wizard", "Scuola di Evocazione", "School of Conjuration", 116),
    Section("PHB", "wizard", "Scuola di Divinazione", "School of Divination", 116),
    Section("PHB", "wizard", "Scuola di Ammaliamento", "School of Enchantment", 117),
    Section("PHB", "wizard", "Scuola di Invocazione", "School of Evocation", 117),
    Section("PHB", "wizard", "Scuola di Illusione", "School of Illusion", 118),
    Section("PHB", "wizard", "Scuola di Necromanzia", "School of Necromancy", 118),
    Section("PHB", "wizard", "Scuola di Trasmutazione", "School of Transmutation", 119),
    # Xanathar's Guide to Everything
    Section("XGE", "barbarian", "Cammino del Guardiano Ancestrale", "Path of the Ancestral Guardian", 9),
    Section("XGE", "barbarian", "Cammino dell'Araldo della Tempesta", "Path of the Storm Herald", 10),
    Section("XGE", "barbarian", "Cammino dello Zelota", "Path of the Zealot", 11),
    Section("XGE", "bard", "Collegio del Fascino", "College of Glamour", 14),
    Section("XGE", "bard", "Collegio delle Lame", "College of Swords", 15),
    Section("XGE", "bard", "Collegio dei Sussurri", "College of Whispers", 16),
    Section("XGE", "cleric", "Dominio della Forgia", "Forge Domain", 18),
    Section("XGE", "cleric", "Dominio della Sepoltura", "Grave Domain", 19),
    Section("XGE", "druid", "Circolo dei Sogni", "Circle of Dreams", 22),
    Section("XGE", "druid", "Circolo del Pastore", "Circle of the Shepherd", 23),
    Section("XGE", "fighter", "Arciere Arcano", "Arcane Archer", 28),
    Section("XGE", "fighter", "Cavaliere", "Cavalier", 30),
    Section("XGE", "fighter", "Samurai", "Samurai", 31),
    Section("XGE", "monk", "Via del Maestro Ubriaco", "Way of the Drunken Master", 33),
    Section("XGE", "monk", "Via del Kensei", "Way of the Kensei", 34),
    Section("XGE", "monk", "Via dell'Anima Solare", "Way of the Sun Soul", 35),
    Section("XGE", "paladin", "Giuramento di Conquista", "Oath of Conquest", 37),
    Section("XGE", "paladin", "Giuramento di Redenzione", "Oath of Redemption", 38),
    Section("XGE", "ranger", "Cacciatore delle Tenebre", "Gloom Stalker", 41),
    Section("XGE", "ranger", "Viandante dell'Orizzonte", "Horizon Walker", 42),
    Section("XGE", "ranger", "Uccisore di Mostri", "Monster Slayer", 43),
    Section("XGE", "rogue", "Inquisitivo", "Inquisitive", 45),
    Section("XGE", "rogue", "Pianificatore", "Mastermind", 46),
    Section("XGE", "rogue", "Esploratore", "Scout", 47),
    Section("XGE", "rogue", "Spadaccino", "Swashbuckler", 47),
    Section("XGE", "sorcerer", "Anima Divina", "Divine Soul", 50),
    Section("XGE", "sorcerer", "Magia delle Ombre", "Shadow Magic", 50),
    Section("XGE", "sorcerer", "Stregoneria della Tempesta", "Storm Sorcery", 51),
    Section("XGE", "warlock", "Il Celestiale", "The Celestial", 54),
    Section("XGE", "warlock", "La Lama del Sortilegio", "The Hexblade", 55),
    Section("XGE", "wizard", "Magia da Guerra", "War Magic", 59),
    # Tasha's Cauldron of Everything
    Section("TCE", "artificer", "Alchimista", "Alchemist", 14),
    Section("TCE", "artificer", "Armorer", "Armorer", 15),
    Section("TCE", "artificer", "Artigliere", "Artillerist", 17),
    Section("TCE", "artificer", "Fabbro da Battaglia", "Battle Smith", 18),
    Section("TCE", "barbarian", "Cammino della Bestia", "Path of the Beast", 24),
    Section("TCE", "barbarian", "Cammino della Magia Selvaggia", "Path of Wild Magic", 25),
    Section("TCE", "bard", "Collegio della Creazione", "College of Creation", 28),
    Section("TCE", "bard", "Collegio dell'Eloquenza", "College of Elo Uence", 29),
    Section("TCE", "cleric", "Dominio dell'Ordine", "Order Domain", 31),
    Section("TCE", "cleric", "Dominio della Pace", "Peace Domain", 32),
    Section("TCE", "cleric", "Dominio del Crepuscolo", "Twilight Domain", 34),
    Section("TCE", "druid", "Circolo delle Spore", "Circle of Spores", 36),
    Section("TCE", "druid", "Circolo delle Stelle", "Circle of Stars", 38),
    Section("TCE", "druid", "Circolo del Fuoco Selvaggio", "Circle of Wildfire", 39),
    Section("TCE", "fighter", "Guerriero Psionico", "Psi Warrior", 42),
    Section("TCE", "fighter", "Cavaliere delle Rune", "Rune Knight", 44),
    Section("TCE", "monk", "Via della Misericordia", "Way of Mercy", 49),
    Section("TCE", "monk", "Via del Sé Astrale", "Way of the Astral Self", 50),
    Section("TCE", "paladin", "Giuramento di Gloria", "Oath of Glory", 53),
    Section("TCE", "paladin", "Giuramento dei Guardiani", "Oath of the Watchers", 54),
    Section("TCE", "ranger", "Viandante Fatato", "Fey Wanderer", 58),
    Section("TCE", "ranger", "Custode degli Sciami", "Swarmkeeper", 59),
    Section("TCE", "rogue", "Fantasma", "Phantom", 62),
    Section("TCE", "rogue", "Lama Psichica", "Soulknife", 63),
    Section("TCE", "sorcerer", "Mente Aberrante", "Aberrant Mind", 66),
    Section("TCE", "sorcerer", "Anima Meccanica", "Clockwork Soul", 68),
    Section("TCE", "warlock", "L'Insondabile", "The Fathomless", 72),
    Section("TCE", "warlock", "Il Genio", "The Genie", 73),
    Section("TCE", "wizard", "Canto della Lama", "Bladesinging", 76),
    Section("TCE", "wizard", "Ordine degli Scribi", "Order of Scribes", 77),
]

BOOK_PATTERNS = {
    "PHB": "Player's Handbook.pdf",
    "XGE": "Xanathar's Guide to Everything.pdf",
    "TCE": "Tasha*Cauldron of Everything.pdf",
}

LEVEL_DEFAULTS = {
    "barbarian": 3,
    "bard": 3,
    "cleric": 1,
    "druid": 2,
    "fighter": 3,
    "monk": 3,
    "paladin": 3,
    "ranger": 3,
    "rogue": 3,
    "sorcerer": 1,
    "warlock": 1,
    "wizard": 2,
    "artificer": 3,
}

CLASS_SECTION_ENDS = {
    ("PHB", "barbarian"): 51,
    ("PHB", "bard"): 56,
    ("PHB", "cleric"): 64,
    ("PHB", "druid"): 70,
    ("PHB", "fighter"): 76,
    ("PHB", "monk"): 82,
    ("PHB", "paladin"): 89,
    ("PHB", "ranger"): 95,
    ("PHB", "rogue"): 99,
    ("PHB", "sorcerer"): 105,
    ("PHB", "warlock"): 110,
    ("PHB", "wizard"): 120,
    ("XGE", "barbarian"): 12,
    ("XGE", "bard"): 17,
    ("XGE", "cleric"): 21,
    ("XGE", "druid"): 27,
    ("XGE", "fighter"): 32,
    ("XGE", "monk"): 36,
    ("XGE", "paladin"): 40,
    ("XGE", "ranger"): 44,
    ("XGE", "rogue"): 48,
    ("XGE", "sorcerer"): 53,
    ("XGE", "warlock"): 56,
    ("XGE", "wizard"): 60,
    ("TCE", "artificer"): 20,
    ("TCE", "barbarian"): 27,
    ("TCE", "bard"): 30,
    ("TCE", "cleric"): 35,
    ("TCE", "druid"): 41,
    ("TCE", "fighter"): 48,
    ("TCE", "monk"): 52,
    ("TCE", "paladin"): 56,
    ("TCE", "ranger"): 61,
    ("TCE", "rogue"): 65,
    ("TCE", "sorcerer"): 70,
    ("TCE", "warlock"): 75,
    ("TCE", "wizard"): 79,
}

CLASS_HEADINGS = {
    "barbarian": "Barbarian",
    "bard": "Bard",
    "cleric": "Cleric",
    "druid": "Druid",
    "fighter": "Fighter",
    "monk": "Monk",
    "paladin": "Paladin",
    "ranger": "Ranger",
    "rogue": "Rogue",
    "sorcerer": "Sorcerer",
    "warlock": "Warlock",
    "wizard": "Wizard",
    "artificer": "Artificer",
}

HEADING_BLACKLIST = (
    "CHAPTER",
    "CHARACTER OPTIONS",
    "CLASS FEATURES",
    "OPTIONAL CLASS",
    "CREATING A",
    "QUICK BUILD",
    "PROFICIENCIES",
    "EQUIPMENT",
    "HIT POINTS",
    "SPELL SLOT",
)

MANUAL_FEATURE_OVERRIDES = {
    "Guerriero Totemico": [
        (3, "Cercatore Spirituale", "Puoi lanciare percezione delle bestie e parlare con gli animali come rituali."),
        (3, "Spirito Totemico", "Scegli Orso, Aquila o Lupo e ottieni il relativo beneficio durante l'ira."),
        (6, "Aspetto della Bestia", "Scegli Orso, Aquila o Lupo per ottenere il relativo beneficio di esplorazione; la scelta può essere diversa da quella del 3° livello."),
        (10, "Viandante Spirituale", "Puoi lanciare comunione con la natura come rituale; uno dei tuoi spiriti animali trasmette le informazioni."),
        (14, "Sintonia Totemica", "Scegli un ulteriore beneficio tra Orso, Aquila e Lupo; la scelta può essere diversa dalle precedenti."),
    ],
    "Via dell'Ombra": [
        (3, "Arti dell'Ombra", "Spendendo 2 punti ki puoi lanciare oscurità, scurovisione, passare senza tracce o silenzio senza componenti materiali; apprendi anche illusione minore."),
        (6, "Passo dell'Ombra", "In luce fioca o oscurità usi un'azione bonus per teletrasportarti fino a 18 metri in uno spazio analogo visibile; hai vantaggio al primo attacco in mischia del turno."),
        (11, "Manto d'Ombra", "In luce fioca o oscurità puoi diventare invisibile con un'azione finché non attacchi, lanci un incantesimo o entri in luce intensa."),
        (17, "Opportunista", "Quando una creatura entro 1,5 metri viene colpita da un'altra creatura, puoi usare la reazione per effettuare un attacco in mischia contro di essa."),
    ],
    "Cacciatore": [
        (3, "Preda del Cacciatore", "Scegli tra Colosso, Sterminatore di Giganti e Devastatore dell'Orda."),
        (7, "Tattiche Difensive", "Scegli tra Sfuggire all'Orda, Difesa dal Multiattacco e Volontà d'Acciaio."),
        (11, "Multiattacco", "Scegli tra Raffica e Attacco Turbinante."),
        (15, "Difesa Superiore del Cacciatore", "Scegli tra Elusione, Opporsi alla Marea e Schivata Prodigiosa."),
    ],
    "Magia da Guerra": [
        (2, "Deviazione Arcana", "Come reazione ottieni +2 alla CA contro un attacco o +4 a un tiro salvezza fallito; fino alla fine del turno successivo puoi lanciare soltanto trucchetti."),
        (2, "Ingegno Tattico", "Aggiungi il modificatore di Intelligenza ai tiri di iniziativa."),
        (6, "Impeto di Potere", "Accumuli energia quando contrasti o dissolvi magie e puoi spenderla per infliggere danni da forza aggiuntivi con un incantesimo da mago."),
        (10, "Magia Durevole", "Mentre mantieni la concentrazione su un incantesimo ottieni +2 alla CA e a tutti i tiri salvezza."),
        (14, "Sudario Deviante", "Quando usi Deviazione Arcana, fino a tre creature a tua scelta entro 18 metri subiscono danni da forza pari a metà del tuo livello da mago."),
    ],
}

FEATURE_EXCLUSIONS = {
    "Cammino della Magia Selvaggia": {"Of Wild Magic"},
    "Custode degli Sciami": {"Primal Companion", "Beast Of The Land", "Actions", "Beast Of The Sea", "Beast Of The Sky"},
    "Fabbro da Battaglia": {"Artificer Infusions", "Arcane Propulsion Armor"},
}


def normalized_with_positions(text: str) -> tuple[str, list[int]]:
    normalized: list[str] = []
    positions: list[int] = []
    for index, char in enumerate(text):
        if char.isalnum():
            normalized.append(char.upper())
            positions.append(index)
    return "".join(normalized), positions


def section_text(text: str, heading: str, next_heading: str | None) -> str:
    normalized, positions = normalized_with_positions(text)
    needle = "".join(char.upper() for char in heading if char.isalnum())
    line_candidates: list[int] = []
    cursor = 0
    for line in text.splitlines(keepends=True):
        line_key = "".join(char.upper() for char in line if char.isalnum())
        if line_key == needle:
            line_candidates.append(cursor)
        cursor += len(line)
    start = line_candidates[-1] if line_candidates else -1
    if start < 0:
        # Fallback for especially damaged OCR headings.
        start_match = normalized.find(needle)
        start = positions[start_match] if start_match >= 0 else -1
    if start < 0:
        raise ValueError(f"Heading not found: {heading}")
    end = len(text)
    if next_heading:
        next_needle = "".join(char.upper() for char in next_heading if char.isalnum())
        cursor = 0
        for line in text.splitlines(keepends=True):
            line_key = "".join(char.upper() for char in line if char.isalnum())
            if cursor > start and line_key == next_needle:
                end = cursor
                break
            cursor += len(line)
        else:
            normalized_start = next((i for i, raw_pos in enumerate(positions) if raw_pos >= start), 0)
            next_match = normalized.find(next_needle, normalized_start + len(needle))
            if next_match >= 0:
                end = positions[next_match]
    return text[start:end].strip()


def is_heading(line: str) -> bool:
    candidate = line.strip(" .:-\t")
    letters = "".join(char for char in candidate if char.isalpha())
    compact = letters.upper()
    if len(letters) < 4 or len(candidate) > 65 or candidate != candidate.upper():
        return False
    if candidate[:1].isdigit() or any(blocked.replace(" ", "") in compact for blocked in HEADING_BLACKLIST):
        return False
    if "FEATURES" in compact or "CHAPTER" in compact or "CHARACTEROPTIONS" in compact or candidate.isdigit():
        return False
    return len(candidate.split()) <= 9


def clean_text(text: str) -> str:
    text = text.replace("\u00ad", "").replace("�", "")
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def page_text_in_columns(page) -> str:
    """Reconstruct the two-column reading order used by the rulebooks."""
    words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    midpoint = page.width / 2
    columns = [
        [word for word in words if (word["x0"] + word["x1"]) / 2 < midpoint],
        [word for word in words if (word["x0"] + word["x1"]) / 2 >= midpoint],
    ]
    rendered_columns: list[str] = []
    for column in columns:
        rows: list[list[dict]] = []
        for word in sorted(column, key=lambda item: (round(item["top"], 1), item["x0"])):
            if not rows or abs(rows[-1][0]["top"] - word["top"]) > 2.2:
                rows.append([word])
            else:
                rows[-1].append(word)
        rendered_columns.append(
            "\n".join(" ".join(word["text"] for word in sorted(row, key=lambda item: item["x0"])) for row in rows)
        )
    return "\n".join(rendered_columns)


def feature_entries(raw_section: str, default_level: int, section_heading: str) -> list[dict]:
    lines = raw_section.splitlines()
    heading_indexes = [
        index
        for index, line in enumerate(lines)
        if is_heading(line) and "".join(filter(str.isalpha, section_heading.upper()))
        not in "".join(filter(str.isalpha, line.upper()))
    ]
    features: list[dict] = []
    seen: set[str] = set()
    for offset, index in enumerate(heading_indexes):
        name = re.sub(r"\s+", " ", lines[index].strip()).title()
        key = re.sub(r"[^a-z0-9]", "", name.lower())
        if not key or key in seen:
            continue
        next_index = heading_indexes[offset + 1] if offset + 1 < len(heading_indexes) else len(lines)
        body = clean_text("\n".join(lines[index + 1 : next_index]))
        if not body or not re.search(r"\bleve[il]\b", body[:500], re.I):
            continue
        level_match = re.search(
            r"\b(\d{1,2})(?:st|nd|rd|th)\s+leve[il]\b", body[:500], re.I
        )
        level = int(level_match.group(1)) if level_match else default_level
        seen.add(key)
        features.append({"level": level, "name": name, "description": body})
    return features


def locate_book(pdf_dir: Path, book: str) -> Path:
    matches = list(pdf_dir.glob(f"D&D 5E - {BOOK_PATTERNS[book]}"))
    if len(matches) != 1:
        raise FileNotFoundError(f"Expected one {book} PDF in {pdf_dir}, found {len(matches)}")
    return matches[0]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_dir", type=Path)
    parser.add_argument("--classes", type=Path, default=Path("public/data/v1/classes.json"))
    args = parser.parse_args()

    readers = {book: pdfplumber.open(locate_book(args.pdf_dir, book)) for book in BOOK_PATTERNS}
    classes = json.loads(args.classes.read_text(encoding="utf-8"))
    by_class = {item["id"]: item for item in classes}
    generated: dict[str, list[dict]] = {class_id: [] for class_id in by_class}

    by_book: dict[str, list[Section]] = {}
    for item in SECTIONS:
        by_book.setdefault(item.book, []).append(item)

    for book, sections in by_book.items():
        reader = readers[book]
        for index, item in enumerate(sections):
            next_item = sections[index + 1] if index + 1 < len(sections) else None
            same_class = next_item is not None and next_item.class_id == item.class_id
            end_page = (
                next_item.page
                if same_class
                else CLASS_SECTION_ENDS.get((book, item.class_id), item.page + 3)
            )
            boundary_heading = (
                next_item.heading
                if same_class
                else CLASS_HEADINGS[next_item.class_id]
                if next_item is not None
                else None
            )
            stop_page = end_page + 1 if next_item is not None else end_page
            pages = range(max(0, item.page - 1), min(len(reader.pages), stop_page))
            raw = "\n".join(page_text_in_columns(reader.pages[page]) for page in pages)
            extracted = section_text(raw, item.heading, boundary_heading)
            features = feature_entries(extracted, LEVEL_DEFAULTS[item.class_id], item.heading)
            features = [
                feature
                for feature in features
                if feature["name"] not in FEATURE_EXCLUSIONS.get(item.subclass_id, set())
            ]
            if item.subclass_id in MANUAL_FEATURE_OVERRIDES:
                features = [
                    {"level": level, "name": name, "description": description}
                    for level, name, description in MANUAL_FEATURE_OVERRIDES[item.subclass_id]
                ]
            if not features:
                # Never silently omit a subclass: preserve the complete source section as one entry.
                features = [
                    {
                        "level": LEVEL_DEFAULTS[item.class_id],
                        "name": item.heading,
                        "description": clean_text(extracted),
                    }
                ]
            generated[item.class_id].append(
                {
                    "subclassId": item.subclass_id,
                    "sourceBook": book,
                    "sourcePages": {"from": item.page, "to": max(item.page, end_page)},
                    "features": features,
                }
            )

    expected = {(item.class_id, item.subclass_id) for item in SECTIONS}
    actual = {(class_id, item["subclassId"]) for class_id, items in generated.items() for item in items}
    catalog = {(item["id"], subclass) for item in classes for subclass in item["subclasses"]}
    if expected != catalog or actual != catalog:
        missing = sorted(catalog - actual)
        extra = sorted(actual - catalog)
        raise ValueError(f"Subclass coverage mismatch. Missing={missing}; extra={extra}")

    for class_id, klass in by_class.items():
        klass["subclassProgressions"] = generated[class_id]
        if class_id == "artificer":
            klass["subclassSources"] = {name: "TCE" for name in klass["subclasses"]}

    args.classes.write_text(json.dumps(classes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for reader in readers.values():
        reader.close()
    print(f"Enriched {len(classes)} classes and {len(actual)} subclasses from PHB, XGE, and TCE.")


if __name__ == "__main__":
    main()
