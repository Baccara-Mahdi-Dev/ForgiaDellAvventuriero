import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CatalogService } from '../../core/catalog.service';
import { SpellCardsPdfService } from '../../core/spell-cards-pdf.service';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { CatalogData } from '../../domain/catalog';
import { Spell } from '../../domain/models';
import { SpellCardsComponent } from './spell-cards.component';

const spell = (input: Partial<Spell> & Pick<Spell, 'id' | 'name'>): Spell => ({
  description: '',
  source: 'SRD',
  level: 1,
  school: 'Invocazione',
  classes: ['wizard'],
  castingTime: { amount: 1, unit: 'action' },
  duration: { unit: 'instantaneous', concentration: false },
  ...input,
});

const catalog = {
  manifest: {
    schemaVersion: 1,
    dataVersion: 'test',
    locale: 'it',
    ruleset: '5e-2014',
    catalog: { ancestries: 0, classes: 1, backgrounds: 0, feats: 0, spells: 3, equipment: 0 },
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
  backgrounds: [],
  feats: [],
  equipment: [],
  classes: [
    {
      id: 'wizard',
      name: 'Mago',
      description: '',
      source: 'SRD',
      hitDie: 6,
      primary: 'int',
      saves: ['int', 'wis'],
      subclassLevel: 2,
      subclasses: ['Invocatore'],
      skillChoices: 0,
      skillOptions: [],
      caster: 'full',
    },
  ],
  subclasses: [
    {
      id: 'wizard-invocatore',
      classId: 'wizard',
      name: 'Invocatore',
      description: '',
      source: 'SRD',
    },
  ],
  spells: [
    spell({
      id: 'fire',
      name: 'Fiamma',
      description: 'Una fiammata.',
      duration: { unit: 'minute', concentration: true },
    }),
    spell({ id: 'shield', name: 'Scudo', school: 'Abiurazione', source: 'PHB' }),
    spell({
      id: 'wave',
      name: 'Onda',
      classes: [],
      subclassGrants: [{ classId: 'wizard', subclassId: 'wizard-invocatore', minLevel: 2 }],
    }),
  ],
} satisfies CatalogData;

describe('pagina card incantesimo', () => {
  const create = () => {
    const downloadSpells = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: CatalogService, useValue: { requireData: () => catalog } },
        { provide: SpellCardsPdfService, useValue: { downloadSpells } },
        { provide: UiFeedbackService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    return {
      component: TestBed.runInInjectionContext(() => new SpellCardsComponent()),
      downloadSpells,
    };
  };

  it('combina nome, classe e concentrazione', () => {
    const { component } = create();
    component.nameFilter.set('fiam');
    component.classFilter.set('wizard');
    component.concentrationFilter.set('Sì');
    expect(component.filteredSpells().map((item) => item.id)).toEqual(['fire']);
  });

  it('filtra gli incantesimi concessi da una sottoclasse', () => {
    const { component } = create();
    component.subclassFilter.set('wizard-invocatore');
    expect(component.filteredSpells().map((item) => item.id)).toEqual(['wave']);
  });

  it('filtra per manuale e mostra il nome leggibile tra i filtri attivi', () => {
    const { component } = create();
    component.sourceFilter.set('SRD');
    expect(component.filteredSpells().map((item) => item.id)).toEqual(['fire', 'wave']);
    expect(component.activeFilters()).toContainEqual({
      key: 'source',
      label: 'Manuale',
      value: 'System Reference Document (SRD)',
    });
  });

  it('gestisce la selezione ed esporta soltanto le card scelte', async () => {
    const { component, downloadSpells } = create();
    component.toggleSpell('shield', true);
    component.toggleSpell('fire', true);
    component.toggleSpell('shield', false);
    await component.exportPdf();
    expect(downloadSpells).toHaveBeenCalledWith([catalog.spells[0]]);
  });

  it('seleziona e deseleziona soltanto gli incantesimi della pagina corrente', () => {
    const { component } = create();
    component.selectCurrentPage();
    expect(component.currentPageSelectionCount()).toBe(3);
    expect(component.currentPageFullySelected()).toBe(true);
    component.deselectCurrentPage();
    expect(component.currentPageSelectionCount()).toBe(0);
  });
});
