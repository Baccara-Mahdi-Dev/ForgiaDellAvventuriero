import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { CatalogData } from '../domain/catalog';
import { AbilityKey, CharacterDraft, Spell } from '../domain/models';
import { characterSpells } from './character-sheet-pdf';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 20;
const CARD_GAP = 10;
const CARD_WIDTH = (PAGE_WIDTH - PAGE_MARGIN * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = (PAGE_HEIGHT - PAGE_MARGIN * 2 - CARD_GAP) / 2;
const CARD_PADDING = 13;
const BODY_SIZE = 7.4;
const BODY_LEADING = 9.2;
const CONTENT_LINES_PER_CARD = 33;

export const SPELL_LEVEL_COLORS = {
  0: '#A8B0BA',
  1: '#5BA7D1',
  2: '#4FAF78',
  3: '#3CA6A6',
  4: '#4778C7',
  5: '#7955B5',
  6: '#B6539A',
  7: '#C94A4A',
  8: '#E47735',
  9: '#E0B83F',
} as const;

interface SpellCard {
  spell: Spell;
  lines: string[];
  part: number;
  parts: number;
}

const clean = (value: unknown): string =>
  String(value ?? '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00d7/g, 'x')
    .replace(/[\u2190-\u21ff]/g, '-')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '-')
    .replace(/[ \t]+/g, ' ')
    .trim();

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = clean(text).split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = word;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function castingTime(spell: Spell): string {
  if (spell.castingTime.text) return spell.castingTime.text;
  const units = {
    action: 'azione',
    'bonus-action': 'azione bonus',
    reaction: 'reazione',
    minute: 'minuto',
    hour: 'ora',
    special: 'speciale',
  } as const;
  return `${spell.castingTime.amount} ${units[spell.castingTime.unit]}`;
}

function duration(spell: Spell): string {
  const textAlreadyMentionsConcentration = /concentrazion/i.test(spell.duration.text ?? '');
  const prefix =
    spell.duration.concentration && !textAlreadyMentionsConcentration ? 'Concentrazione, ' : '';
  if (spell.duration.text) return `${prefix}${spell.duration.text}`;
  if (spell.duration.unit === 'instantaneous') return 'Istantanea';
  if (spell.duration.unit === 'until-dispelled') return 'Finche non dissolto';
  if (spell.duration.unit === 'special') return `${prefix}Speciale`;
  const amount = spell.duration.amount ?? 1;
  const units = {
    round: ['round', 'round'],
    minute: ['minuto', 'minuti'],
    hour: ['ora', 'ore'],
    day: ['giorno', 'giorni'],
  } as const;
  return `${prefix}${amount} ${units[spell.duration.unit][amount === 1 ? 0 : 1]}`;
}

function resolution(spell: Spell): string {
  const labels: Record<AbilityKey, string> = {
    str: 'FOR',
    dex: 'DES',
    con: 'COS',
    int: 'INT',
    wis: 'SAG',
    cha: 'CAR',
  };
  const parts: string[] = [];
  if (spell.attackRoll)
    parts.push(`Attacco ${spell.attackRoll === 'ranged' ? 'a distanza' : 'in mischia'}`);
  const saves = spell.savingThrows?.length
    ? spell.savingThrows
    : spell.savingThrow
      ? [spell.savingThrow]
      : [];
  if (saves.length) parts.push(`TS ${saves.map((save) => labels[save]).join('/')}`);
  return parts.join(' - ') || 'Nessun tiro richiesto';
}

function levelLabel(spell: Spell): string {
  return spell.level === 0 ? 'TRUCCHETTO' : `LIVELLO ${spell.level}`;
}

function spellContent(spell: Spell): string[] {
  const tags = [spell.ritual ? 'Rituale' : '', spell.duration.concentration ? 'Concentrazione' : '']
    .filter(Boolean)
    .join(' - ');
  const higherLevels =
    spell.higherLevels ?? spell.description.match(/At Higher Levels\.\s*([\s\S]+)$/i)?.[1]?.trim();
  const description = spell.description.replace(/\s*At Higher Levels\.\s*[\s\S]*$/i, '').trim();
  return [
    `LANCIO: ${castingTime(spell)}`,
    `GITTATA: ${spell.range || '-'}`,
    `DURATA: ${duration(spell)}`,
    `COMPONENTI: ${spell.components || '-'}`,
    `RISOLUZIONE: ${resolution(spell)}`,
    tags ? `PROPRIETA: ${tags}` : '',
    spell.damage
      ? `DANNI: ${spell.damage.formula} ${spell.damage.type}${spell.damage.note ? ` - ${spell.damage.note}` : ''}`
      : '',
    '',
    `DESCRIZIONE: ${description}`,
    '',
    higherLevels ? `AI LIVELLI SUPERIORI: ${higherLevels}` : '',
  ].filter((line, index, all) => line || (index > 0 && all[index - 1] !== ''));
}

function buildCards(spells: Spell[], font: PDFFont): SpellCard[] {
  return spells.flatMap((spell) => {
    const lines = spellContent(spell).flatMap((line) =>
      line ? wrap(line, font, BODY_SIZE, CARD_WIDTH - CARD_PADDING * 2) : [''],
    );
    const chunks: string[][] = [];
    for (let index = 0; index < lines.length; index += CONTENT_LINES_PER_CARD)
      chunks.push(lines.slice(index, index + CONTENT_LINES_PER_CARD));
    if (!chunks.length) chunks.push([]);
    return chunks.map((chunk, index) => ({
      spell,
      lines: chunk,
      part: index + 1,
      parts: chunks.length,
    }));
  });
}

function cardPosition(index: number): { x: number; y: number } {
  const column = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: PAGE_MARGIN + column * (CARD_WIDTH + CARD_GAP),
    y: PAGE_HEIGHT - PAGE_MARGIN - CARD_HEIGHT - row * (CARD_HEIGHT + CARD_GAP),
  };
}

function colorComponents(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function contrastingTextColor(hex: string) {
  const linear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const [red, green, blue] = colorComponents(hex).map(linear);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const dark = rgb(0.08, 0.1, 0.12);
  const darkLuminance = 0.01;
  const contrastWithDark = (luminance + 0.05) / (darkLuminance + 0.05);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithDark > contrastWithWhite ? dark : rgb(1, 1, 1);
}

function drawCard(
  page: PDFPage,
  card: SpellCard,
  index: number,
  font: PDFFont,
  bold: PDFFont,
): void {
  const { x, y } = cardPosition(index);
  const levelColor = SPELL_LEVEL_COLORS[card.spell.level as keyof typeof SPELL_LEVEL_COLORS];
  const accent = rgb(...colorComponents(levelColor));
  const headerText = contrastingTextColor(levelColor);
  page.drawRectangle({
    x,
    y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    color: rgb(0.985, 0.975, 0.94),
    borderColor: rgb(0.35, 0.31, 0.25),
    borderWidth: 0.9,
  });
  page.drawRectangle({ x, y: y + CARD_HEIGHT - 40, width: CARD_WIDTH, height: 40, color: accent });
  const title = clean(card.spell.name);
  let titleSize = 12;
  while (bold.widthOfTextAtSize(title, titleSize) > CARD_WIDTH - CARD_PADDING * 2 && titleSize > 8)
    titleSize -= 0.5;
  page.drawText(title, {
    x: x + CARD_PADDING,
    y: y + CARD_HEIGHT - 18,
    size: titleSize,
    font: bold,
    color: headerText,
  });
  page.drawText(
    `${levelLabel(card.spell)} - ${clean(card.spell.school).toUpperCase()}${card.parts > 1 ? ` - PARTE ${card.part}/${card.parts}` : ''}`,
    {
      x: x + CARD_PADDING,
      y: y + CARD_HEIGHT - 33,
      size: 6.5,
      font: bold,
      color: headerText,
    },
  );
  let lineY = y + CARD_HEIGHT - 55;
  for (const line of card.lines) {
    if (line)
      page.drawText(line, {
        x: x + CARD_PADDING,
        y: lineY,
        size: BODY_SIZE,
        font,
        color: rgb(0.13, 0.12, 0.1),
      });
    lineY -= BODY_LEADING;
  }
  page.drawText(`Forgia dell'Avventuriero - ${clean(card.spell.source)}`, {
    x: x + CARD_PADDING,
    y: y + 8,
    size: 5.5,
    font,
    color: rgb(0.42, 0.39, 0.34),
  });
}

export function orderedCharacterSpells(draft: CharacterDraft, catalog: CatalogData): Spell[] {
  return characterSpells(draft, catalog).sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name, 'it'),
  );
}

export async function buildSpellCardsPdf(
  draft: CharacterDraft,
  catalog: CatalogData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cards = buildCards(orderedCharacterSpells(draft, catalog), font);
  if (!cards.length) throw new Error('Nessun incantesimo da esportare.');
  for (let start = 0; start < cards.length; start += 4) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cards.slice(start, start + 4).forEach((card, index) => drawCard(page, card, index, font, bold));
  }
  pdf.setTitle(`${draft.name || 'Personaggio'} - Carte incantesimo`);
  pdf.setSubject('Incantesimi ordinati per livello e nome');
  pdf.setCreator("Forgia dell'Avventuriero");
  pdf.setProducer("Forgia dell'Avventuriero");
  return pdf.save();
}
