import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { Spell } from '../../../domain/models';
import { SpellsStepComponent } from './spells-step.component';

const spell: Spell = {
  id: 'test-spell',
  name: 'Incantesimo di prova',
  source: 'XGE',
  level: 2,
  school: 'Trasmutazione',
  classes: ['wizard'],
  description: 'Descrizione completa. '.repeat(50) + 'Ultima informazione.',
  castingTime: {
    amount: 1,
    unit: 'reaction',
    text: '1 reazione',
    condition: 'Quando vieni colpito',
  },
  duration: { unit: 'minute', amount: 1, concentration: true, text: 'Fino a 1 minuto' },
  range: '9 metri',
  components: 'V, S, M (una gemma da 100 mo)',
  ritual: true,
  savingThrows: ['str'],
  damage: {
    formula: '2d6',
    type: 'contundenti',
    note: 'Danni iniziali',
    scaling: 'Un dado aggiuntivo',
  },
  higherLevels: 'Un bersaglio aggiuntivo',
  subclassGrants: [
    { classId: 'wizard', subclassId: 'Invocatore', minLevel: 3, note: 'Sempre conosciuto' },
  ],
};

function setup(limitReached = false) {
  const draft = signal({ spellIds: [] as string[], level: 3 });
  const wizard = {
    store: { draft, selectedClass: () => ({ caster: 'full' }), availableSpells: () => [spell] },
    homebrewSpells: [],
    spellCardsExporting: () => false,
    selectedCantripCount: 0,
    selectedLeveledSpellCount: 0,
    spellLimits: { cantrips: 2, leveledSpells: 2 },
    spellSlots: [],
    grantedSpellSources: [],
    visibleSpells: [spell],
    filteredSpells: [spell],
    spellSearch: () => '',
    spellLevelFilter: () => 'all',
    homebrewSpellOpen: () => false,
    isGranted: () => false,
    spellLimitReached: () => limitReached && !draft().spellIds.includes(spell.id),
    spellLevel: () => 'Livello 2',
    spellDescription: (s: Spell) => s.description,
    castingTime: (s: Spell) => s.castingTime.text,
    duration: (s: Spell) => s.duration.text,
    spellResolution: () => 'TS Forza',
    spellHigherLevels: (s: Spell) => s.higherLevels,
    traditionName: () => 'Mago',
    toggleSpell: vi.fn(() =>
      draft.update((d) => ({ ...d, spellIds: d.spellIds.length ? [] : [spell.id] })),
    ),
  };
  const fixture = TestBed.createComponent(SpellsStepComponent);
  fixture.componentRef.setInput('wizard', wizard);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const dialog = root.querySelector('dialog')!;
  dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
  dialog.close = vi.fn(() => dialog.removeAttribute('open'));
  return { fixture, root, dialog, wizard, draft };
}

describe('Wizard: lettura e selezione incantesimi', () => {
  it('permette di leggere tutti i dettagli anche a limite raggiunto senza selezionare', () => {
    const { fixture, root, dialog, wizard } = setup(true);
    expect(root.querySelector<HTMLButtonElement>('.spell-select')!.disabled).toBe(true);
    root.querySelector<HTMLButtonElement>('.spell-read')!.click();
    fixture.detectChanges();
    expect(dialog.showModal).toHaveBeenCalled();
    expect(wizard.toggleSpell).not.toHaveBeenCalled();
    for (const value of [
      spell.description,
      spell.components!,
      'Quando vieni colpito',
      'Danni iniziali',
      'Un dado aggiuntivo',
      'Un bersaglio aggiuntivo',
      'Invocatore',
      'Sempre conosciuto',
      'TS Forza',
    ]) {
      expect(dialog.textContent).toContain(value);
    }
    expect(dialog.querySelector('.spell-description')).toBeNull();
    dialog.dispatchEvent(new Event('cancel'));
    expect(fixture.componentInstance.openedSpell()).toBeNull();
    expect(dialog.close).toHaveBeenCalled();
  });

  it('aggiunge e rimuove solo con i controlli dedicati, anche dal dettaglio', () => {
    const { fixture, root, dialog, wizard, draft } = setup();
    root.querySelector<HTMLElement>('.spell-card')!.click();
    expect(wizard.toggleSpell).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('.spell-select')!.click();
    fixture.detectChanges();
    expect(draft().spellIds).toEqual([spell.id]);
    expect(root.querySelector('.spell-select')!.getAttribute('aria-label')).toContain('Rimuovi');
    root.querySelector<HTMLButtonElement>('.spell-read')!.click();
    fixture.detectChanges();
    dialog.querySelector<HTMLButtonElement>('.spell-select')!.click();
    fixture.detectChanges();
    expect(draft().spellIds).toEqual([]);
    expect(root.querySelector('.spell-select')!.getAttribute('aria-label')).toContain('Aggiungi');
  });

  it('non consente di selezionare dal dettaglio un incantesimo concesso o futuro', () => {
    const { fixture, dialog } = setup();
    fixture.componentInstance.openSpell(spell, false);
    fixture.detectChanges();
    expect(dialog.querySelector('.spell-select')).toBeNull();
  });
});
