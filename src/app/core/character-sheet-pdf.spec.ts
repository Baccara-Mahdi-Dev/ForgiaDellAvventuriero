import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { CatalogData } from '../domain/catalog';
import { CharacterDraft } from '../domain/models';
import { buildCharacterSheetPdf } from './character-sheet-pdf';

describe('buildCharacterSheetPdf', () => {
  it('preserva le tre pagine e produce un PDF compilato', async () => {
    const template = await PDFDocument.create();
    const firstPage = template.addPage([612, 792]);
    template.addPage([594, 783]);
    template.addPage([594, 783]);
    const form = template.getForm();
    const characterName = form.createTextField('CharacterName');
    characterName.addToPage(firstPage, { x: 20, y: 740, width: 200, height: 20 });
    const classLevel = form.createTextField('ClassLevel');
    classLevel.addToPage(firstPage, { x: 230, y: 740, width: 150, height: 20 });
    const input = await template.save();
    const draft: CharacterDraft = {
      schemaVersion: 1,
      id: 'test-character',
      revision: 0,
      updatedAt: new Date(0).toISOString(),
      name: 'Aria della Forgia',
      alignment: 'neutral-good',
      abilityMethod: 'custom',
      abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 11, cha: 8 },
      ancestryId: '',
      classId: '',
      subclassId: '',
      backgroundId: '',
      level: 1,
      asi: {},
      featIds: [],
      spellIds: [],
      notes: '',
    };
    const catalog: CatalogData = {
      manifest: {
        schemaVersion: 1,
        dataVersion: 'test',
        locale: 'it',
        ruleset: '5e-2014',
        catalog: {
          ancestries: 0,
          classes: 0,
          backgrounds: 0,
          feats: 0,
          spells: 0,
          equipment: 0,
        },
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
      spells: [],
      equipment: [],
    };
    const result = await buildCharacterSheetPdf(input, draft, catalog);
    const written = await PDFDocument.load(result);
    expect(written.getPageCount()).toBe(3);
    expect(written.getTitle()).toContain('Aria della Forgia');
    expect(written.getForm().getTextField('CharacterName').getText()).toBe('Aria della Forgia');
    expect(result.length).toBeGreaterThan(input.length);
  });
});
