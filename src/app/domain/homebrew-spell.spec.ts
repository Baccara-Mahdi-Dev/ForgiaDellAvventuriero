import { describe, expect, it } from 'vitest';
import { HomebrewSpell } from './models';
import { asSpell } from './homebrew-spell';

describe('incantesimi homebrew', () => {
  it('adatta i dati homebrew al formato usato da lista e PDF', () => {
    const homebrew = {
      id: 'homebrew-speò',
      name: 'Nube di cenere',
      level: 1,
      school: 'Evocazione',
      description:
        'Una nube pesante si scagiona dal punto da te indicato entro 36m, la nube ha diametro 12m. Impone svantaggio a tutti i tiri a chi è dentro la nube, inoltre chi si trova dentro deve fare un ts CONST o subire 1d6 danno...',
      castingTime: 'bonus-action',
      duration: 'Concentrazione, fino a 1 minuto',
      components: ['V', 'S', 'M'],
      materials: ['un pugno di cenere e un accaromp'],
      damage: { formula: '1d6', type: 'fuoco' },
    } satisfies HomebrewSpell;

    const spell = asSpell(homebrew);
    expect(spell.castingTime.unit).toBe('bonus-action');
    expect(spell.duration.text).toBe('Concentrazione, fino a 1 minuto');
    expect(spell.components).toBe('V, S, M');
    expect(spell.damage).toEqual({ formula: '1d6', type: 'fuoco' });
  });
});
