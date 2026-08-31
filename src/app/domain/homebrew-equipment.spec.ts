import { describe, expect, it } from 'vitest';
import {
  newHomebrewEquipment,
  normalizeHomebrewEquipment,
  validateHomebrewEquipment,
} from './homebrew-equipment';

describe('equipaggiamento homebrew', () => {
  it('mantiene una sola tipologia compatibile', () => {
    const armor = normalizeHomebrewEquipment({
      ...newHomebrewEquipment(),
      name: 'Corazza della forgia',
      description: 'Una corazza incantata.',
      kind: 'armor',
      category: 'weapon',
      armorType: 'medium',
      armorClass: 14,
      damage: '1d8',
      damageType: 'fuoco',
    });
    expect(armor.category).toBe('armor');
    expect(armor.damage).toBeUndefined();
    expect(armor.damageType).toBeUndefined();
  });

  it('valida danni, cariche e riferimenti agli incantesimi', () => {
    const item = normalizeHomebrewEquipment({
      ...newHomebrewEquipment(),
      name: 'Spada incompleta',
      description: 'Un esempio volutamente incompleto.',
      kind: 'weapon',
      effects: [
        {
          id: 'fire',
          name: 'Fiamma',
          type: 'extra-damage',
          activation: 'active',
          chargesCost: 1,
        },
      ],
      spellGrants: [{ id: 'spell', spellId: 'missing', usage: 'charges', chargesCost: 1 }],
    });
    const errors = validateHomebrewEquipment(item, new Set(['fireball']));
    expect(errors.join(' ')).toContain('danno base');
    expect(errors.join(' ')).toContain('consuma cariche');
    expect(errors.join(' ')).toContain('non esiste');
  });
});
