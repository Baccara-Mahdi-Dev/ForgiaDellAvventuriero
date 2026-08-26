import { describe, expect, it } from 'vitest';
import { AbilityMethod } from '../models/enum/ability-method';
import { CharacterDraft, EquipmentItem } from './models';
import {
  battleSmithUsesIntelligence,
  damageForHands,
  hasTwoWeaponFighting,
  isBattleSmith,
  isUnarmedStrike,
  magicWeaponBaseCandidates,
  requiresTwoHands,
  resolveWeaponBase,
  unarmedDamage,
} from './weapon-loadout';

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
  abilityMethod: AbilityMethod.CUSTOM,
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

  it('applica il dado delle arti marziali del Monaco ai colpi senz’armi', () => {
    expect(unarmedDamage('monk', 1)).toBe('1d4');
    expect(unarmedDamage('monk', 5)).toBe('1d6');
    expect(unarmedDamage('monk', 11)).toBe('1d8');
    expect(unarmedDamage('monk', 17)).toBe('1d10');
  });

  it('tratta i pugni delle altre classi come attacchi improvvisati', () => {
    expect(unarmedDamage('fighter', 20)).toBe('1d4');
    expect(isUnarmedStrike({ ...weapon, tags: ['unarmed'] })).toBe(true);
    expect(isUnarmedStrike(weapon)).toBe(false);
  });

  it('attiva Battle Ready del Fabbro da Battaglia dal 3° livello', () => {
    const battleSmith = {
      ...draft,
      classId: 'artificer',
      subclassId: 'Fabbro da Battaglia',
      level: 3,
    };
    expect(isBattleSmith({ ...battleSmith, level: 2 })).toBe(false);
    expect(isBattleSmith(battleSmith)).toBe(true);
    expect(battleSmithUsesIntelligence(battleSmith, { ...weapon, magical: true })).toBe(true);
    expect(
      battleSmithUsesIntelligence(
        battleSmith,
        { ...weapon, magical: true },
        { useIntelligence: false },
      ),
    ).toBe(false);
    expect(battleSmithUsesIntelligence(battleSmith, weapon)).toBe(false);
  });

  it('fa ereditare a Lingua di fiamme le statistiche della spada scelta', () => {
    const flameTongue: EquipmentItem = {
      ...weapon,
      id: 'magic-lingua-di-fiamme',
      name: 'Lingua di fiamme',
      magical: true,
      specialProperties: 'Arma (qualsiasi spada), rara (richiede sintonia)',
      damage: '2d6',
      damageType: 'contundenti',
      additionalDamage: '2d6',
      additionalDamageType: 'fuoco',
    };
    const greatsword = {
      ...weapon,
      id: 'greatsword',
      name: 'Spadone',
      damage: '2d6',
      properties: ['pesante', 'a due mani'],
    };
    const options = magicWeaponBaseCandidates(flameTongue, [weapon, greatsword]);
    expect(options.map((item) => item.id)).toEqual(['longsword', 'greatsword']);
    expect(resolveWeaponBase(flameTongue, [weapon, greatsword], 'greatsword')).toMatchObject({
      name: 'Lingua di fiamme (Spadone)',
      damage: '2d6',
      damageType: 'taglienti',
      properties: ['pesante', 'a due mani'],
      additionalDamage: '2d6',
      additionalDamageType: 'fuoco',
    });
  });

  it('riconosce automaticamente le armi magiche con una base fissa', () => {
    const maul = {
      ...weapon,
      id: 'maul',
      name: 'Maglio',
      damage: '2d6',
      properties: ['pesante', 'a due mani'],
    };
    const magicMaul = {
      ...weapon,
      id: 'magic-martello-dei-fulmini',
      name: 'Martello dei fulmini',
      magical: true,
      specialProperties: 'Arma (maglio), leggendaria',
      damage: '1d6',
      damageType: 'contundenti',
    };
    expect(resolveWeaponBase(magicMaul, [maul])).toMatchObject({
      name: 'Martello dei fulmini (Maglio)',
      damage: '2d6',
      properties: ['pesante', 'a due mani'],
    });
  });
});
