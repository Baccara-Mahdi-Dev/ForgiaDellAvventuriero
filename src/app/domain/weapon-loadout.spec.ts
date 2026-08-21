import { describe, expect, it } from 'vitest';
import { CharacterDraft, EquipmentItem } from './models';
import { damageForHands, hasTwoWeaponFighting, requiresTwoHands } from './weapon-loadout';

const weapon: EquipmentItem = {
  id: 'longsword',
  name: 'Spada lunga',
  category: 'weapon',
  group: 'Armi marziali da mischia',
  cost: '15 mo',
  weightKg: 1.4,
  source: 'SRD',
  damage: '1d8',
  damageType: 'taglienti',
  properties: ['versatile 1d10'],
};

const draft = {
  schemaVersion: 1,
  id: 'test',
  revision: 0,
  updatedAt: '2026-01-01',
  name: '',
  abilityMethod: 'custom',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  ancestryId: '',
  classId: '',
  subclassId: '',
  backgroundId: '',
  level: 1,
  asi: {},
  featIds: [],
  spellIds: [],
  notes: '',
} satisfies CharacterDraft;

describe('loadout delle armi', () => {
  it('riconosce le armi obbligatoriamente a due mani', () => {
    expect(requiresTwoHands({ ...weapon, properties: ['pesante', 'a due mani'] })).toBe(true);
    expect(requiresTwoHands(weapon)).toBe(false);
  });

  it('usa il dado versatile quando l’arma è impugnata a due mani', () => {
    expect(damageForHands(weapon, 1)).toBe('1d8');
    expect(damageForHands(weapon, 2)).toBe('1d10');
  });

  it('riconosce lo stile Combattere con Due Armi da qualsiasi scelta di classe', () => {
    expect(hasTwoWeaponFighting(draft)).toBe(false);
    expect(
      hasTwoWeaponFighting({
        ...draft,
        classFeatureChoices: { 'fighter-fighting-style': ['two-weapon-fighting'] },
      }),
    ).toBe(true);
  });
});
