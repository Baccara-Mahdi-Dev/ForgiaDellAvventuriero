import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { CatalogData } from '../domain/catalog';
import { CharacterDraft, Spell } from '../domain/models';
import { AbilityMethod } from '../models/enum/ability-method';
import { buildSpellCardsPdf, orderedCharacterSpells, SPELL_LEVEL_COLORS } from './spell-cards-pdf';

const spell = (id: string, name: string, level: number): Spell => ({
  id,
  name,
  level,
  description: `Descrizione completa di ${name}.`,
  source: 'SRD',
  school: 'Evocazione',
  classes: ['wizard'],
  castingTime: { amount: 1, unit: 'action' },
  duration: { unit: 'instantaneous', concentration: false },
});

const spells = [
  spell('zeta', 'Zefiro', 1),
  spell('brace', 'Brace', 0),
  spell('alba', 'Alba', 1),
  spell('dardo', 'Dardo', 2),
  spell('cenere', 'Cenere', 0),
];

const catalog = {
  manifest: {
    schemaVersion: 1,
    dataVersion: 'test',
    locale: 'it',
    ruleset: '5e-2014',
    catalog: { ancestries: 0, classes: 0, backgrounds: 0, feats: 0, spells: 5, equipment: 0 },
    files: {
      ancestries: 'ancestries.json',
      classes: 'classes.json',
      backgrounds: 'backgrounds.json',
      feats: 'feats.json',
      spells: 'spells.json',
      equipment: 'equipment.json',
    },
    sources: [],
  },
  ancestries: [],
  classes: [],
  backgrounds: [],
  feats: [],
  spells,
  equipment: [],
} satisfies CatalogData;

const draft: CharacterDraft = {
  schemaVersion: 1,
  id: 'test-character',
  revision: 0,
  updatedAt: new Date(0).toISOString(),
  name: 'Aria della Forgia',
  abilityMethod: AbilityMethod.CUSTOM,
  abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 11, cha: 8 },
  ancestryId: '',
  classId: 'wizard',
  subclassId: '',
  backgroundId: '',
  level: 3,
  asi: {},
  featIds: [],
  spellIds: spells.map((item) => item.id),
  notes: '',
};

describe('carte PDF degli incantesimi', () => {
  it('usa la palette prevista per tutti i livelli', () => {
    expect(SPELL_LEVEL_COLORS).toEqual({
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
    });
  });

  it('ordina prima per livello e poi alfabeticamente', () => {
    expect(orderedCharacterSpells(draft, catalog).map((item) => item.name)).toEqual([
      'Brace',
      'Cenere',
      'Alba',
      'Zefiro',
      'Dardo',
    ]);
  });

  it('genera quattro carte per pagina senza perdere gli incantesimi', async () => {
    const bytes = await buildSpellCardsPdf(draft, catalog);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toContain('Aria della Forgia');
    expect(bytes.length).toBeGreaterThan(2_000);
  });

  it('rifiuta una lista vuota', async () => {
    await expect(buildSpellCardsPdf({ ...draft, spellIds: [] }, catalog)).rejects.toThrow(
      'Nessun incantesimo',
    );
  });
});
