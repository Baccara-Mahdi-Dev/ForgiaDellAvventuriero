import { describe, expect, it } from 'vitest';
import { CatalogData } from '../../domain/catalog';
import { CharacterClass, DerivedCharacter, EquipmentItem } from '../../domain/models';
import { decodePersistedCharacter, InvalidCharacterError } from '../data-access/character-dto';
import { createFreshCharacter, normalizeCharacterDraft } from './character-draft';
import { changeAncestry, changeClass, changeLevel } from './character-transitions';
import { selectCharacterSpells } from './spellcasting.rules';
import { computeWeaponProfile } from './weapon-profile.rules';

const fresh = () => createFreshCharacter('3.1.0', 'character-1', '2026-01-01T00:00:00.000Z');

describe('confini architetturali del personaggio', () => {
  it('decodifica il formato V1 e rifiuta capacità incomplete', () => {
    const draft = fresh();
    expect(decodePersistedCharacter(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
    expect(() =>
      decodePersistedCharacter({ ...draft, abilities: { ...draft.abilities, str: '18' } }),
    ).toThrow(InvalidCharacterError);
  });

  it('normalizza in modo idempotente', () => {
    const legacy = { ...fresh(), sanityScore: 99, coins: undefined };
    const context = { catalogVersion: '3.1.0', classes: [] };
    const once = normalizeCharacterDraft(legacy, context);
    expect(normalizeCharacterDraft(once, context)).toEqual(once);
    expect(once.sanityScore).toBe(20);
    expect(once.coins).toEqual({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  });

  it('rende atomici i reset per razza, classe e livello', () => {
    const draft = {
      ...fresh(),
      ancestryId: 'old-ancestry',
      classId: 'fighter',
      ancestryBonusAbilities: ['str' as const],
      featIds: ['feat'],
      spellIds: ['spell'],
      hpMethod: 'roll' as const,
      hpRolls: [],
    };
    expect(changeAncestry(draft, 'new-ancestry')).toMatchObject({
      ancestryId: 'new-ancestry',
      ancestryBonusAbilities: [],
      featIds: [],
    });
    expect(changeClass(draft, 'wizard')).toMatchObject({
      classId: 'wizard',
      subclassId: '',
      spellIds: [],
    });
    const klass = { id: 'fighter', hitDie: 10 } as CharacterClass;
    expect(changeLevel(draft, klass, 3, () => 0.5).hpRolls).toEqual([6, 6]);
  });

  it('usa un solo selettore per magie scelte, concesse e homebrew', () => {
    const draft = {
      ...fresh(),
      spellIds: ['selected'],
      homebrewSpells: [
        {
          id: 'homebrew',
          name: 'Luce della forgia',
          level: 0,
          school: 'Evocation',
          description: 'Luce.',
          castingTime: 'action' as const,
          duration: 'Istantanea',
          concentration: false,
          components: ['V' as const],
        },
      ],
    };
    const catalog = {
      ancestries: [],
      feats: [],
      classes: [],
      equipment: [],
      spells: [{ id: 'selected', name: 'Dardo', level: 1 }],
    } as unknown as CatalogData;
    expect(selectCharacterSpells(draft, catalog).map((spell) => spell.id)).toEqual([
      'homebrew',
      'selected',
    ]);
  });

  it('calcola attacco e danno dell’arma in un profilo condiviso', () => {
    const draft = fresh();
    const weapon: EquipmentItem = {
      id: 'rapier',
      name: 'Stocco',
      category: 'weapon',
      group: 'martial',
      cost: '25 mo',
      weightKg: 1,
      source: 'SRD',
      damage: '1d8',
      damageType: 'perforanti',
      finesse: true,
      proficiency: 'martial',
    };
    const derived = {
      modifiers: { str: 1, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
      proficiency: 2,
      weaponProficiencies: ['martial'],
    } as DerivedCharacter;
    const profile = computeWeaponProfile(draft, derived, [weapon], weapon);
    expect(profile).toMatchObject({
      proficient: true,
      abilityModifier: 3,
      attackBonus: 5,
      damageDice: '1d8',
      damageModifier: 3,
    });
  });
});
