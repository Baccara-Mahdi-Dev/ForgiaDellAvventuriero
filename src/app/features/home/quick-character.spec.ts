import { describe, expect, it } from 'vitest';
import { CatalogData } from '../../domain/catalog';
import { CharacterClass, EquipmentItem, Spell } from '../../domain/models';
import { derive } from '../../domain/rules';
import { buildQuickCharacter, QUICK_CLASS_PROFILES, quickClassOptions } from './quick-character';

const klass = (id: string, name: string): CharacterClass => ({
  id,
  name,
  description: '',
  source: 'SRD',
  hitDie: 8,
  primary: 'wis',
  saves: ['wis', 'cha'],
  subclassLevel: id === 'cleric' ? 1 : 3,
  subclasses: id === 'cleric' ? ['Dominio della Vita'] : [],
  skillChoices: 2,
  skillOptions: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
  armorProficiencies: ['light', 'medium', 'shield'],
  weaponProficiencies: ['simple'],
  caster: id === 'cleric' ? 'full' : undefined,
});

const equipment = (
  id: string,
  category: EquipmentItem['category'],
  weightKg: number,
): EquipmentItem => ({
  id,
  name: id,
  category,
  group: '',
  cost: '',
  weightKg,
  source: 'SRD',
  ...(category === 'armor' && id !== 'shield'
    ? { armorType: id === 'scale-mail' ? ('medium' as const) : ('light' as const), armorClass: 12 }
    : {}),
  ...(id === 'shield' ? { armorType: 'shield' as const, armorClass: 2 } : {}),
});

const spell = (id: string, level: number): Spell => ({
  id,
  name: id,
  description: '',
  source: 'SRD',
  level,
  school: 'evocazione',
  classes: ['cleric'],
  castingTime: { amount: 1, unit: 'action' },
  duration: { unit: 'instantaneous', concentration: false },
});

const catalog: CatalogData = {
  manifest: {
    schemaVersion: 1,
    dataVersion: 'test',
    locale: 'it',
    ruleset: '5e-2014',
    catalog: { ancestries: 1, classes: 1, backgrounds: 1, feats: 0, spells: 6, equipment: 5 },
    files: {
      ancestries: '',
      classes: '',
      backgrounds: '',
      feats: '',
      spells: '',
      equipment: '',
    },
    sources: ['SRD'],
  },
  ancestries: [
    {
      id: 'human',
      name: 'Umano',
      description: '',
      source: 'SRD',
      race: 'Umano',
      bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
      speed: 9,
      traits: [],
      languages: ['Comune'],
    },
  ],
  classes: [klass('cleric', 'Chierico')],
  backgrounds: [
    {
      id: 'acolyte',
      name: 'Accolito',
      description: '',
      source: 'SRD',
      skills: ['Intuizione', 'Religione'],
      languageChoices: 2,
    },
  ],
  feats: [],
  spells: [
    spell('guidance', 0),
    spell('sacred-flame', 0),
    spell('bless', 1),
    spell('healing-word', 1),
    spell('guiding-bolt', 1),
    spell('sanctuary', 1),
  ],
  equipment: [
    equipment('scale-mail', 'armor', 20.4),
    equipment('mace', 'weapon', 1.8),
    equipment('shield', 'armor', 2.7),
    equipment('holy-emblem', 'adventuring-gear', 0),
    equipment('backpack', 'adventuring-gear', 2.3),
  ],
};

describe('creazione rapida', () => {
  it('espone solo i profili delle classi già visibili e sdoppia il Guerriero', () => {
    const options = quickClassOptions([klass('fighter', 'Guerriero'), klass('cleric', 'Chierico')]);
    expect(options.map((option) => option.label)).toEqual([
      'Chierico',
      'Guerriero (FOR)',
      'Guerriero (DES)',
    ]);
  });

  it('usa sempre punteggi validi dello standard array', () => {
    for (const profile of QUICK_CLASS_PROFILES) {
      expect(Object.values(profile.abilities).sort((a, b) => a - b)).toEqual([
        8, 10, 12, 13, 14, 15,
      ]);
    }
  });

  it('crea un livello 1 completo con sottoclasse, magia e carico entro capacità', () => {
    const draft = buildQuickCharacter(
      {
        name: '  Liora  ',
        profileId: 'cleric',
        ancestryId: 'human',
        subclassId: 'Dominio della Vita',
      },
      catalog,
    );

    expect(draft.name).toBe('Liora');
    expect(draft.level).toBe(1);
    expect(draft.classId).toBe('cleric');
    expect(draft.subclassId).toBe('Dominio della Vita');
    expect(draft.ancestryId).toBe('human');
    expect(draft.spellIds).toEqual([
      'guidance',
      'sacred-flame',
      'bless',
      'healing-word',
      'guiding-bolt',
      'sanctuary',
    ]);
    expect(draft.equippedArmorId).toBe('scale-mail');
    expect(draft.shieldEquipped).toBe(true);
    expect(draft.inventory?.map((entry) => entry.equipmentId)).toEqual([
      'scale-mail',
      'mace',
      'shield',
      'holy-emblem',
      'backpack',
    ]);
    const load = derive(draft, catalog);
    expect(load.inventoryWeightKg).toBeLessThanOrEqual(load.carryingCapacityKg);
  });
});
