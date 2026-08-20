import { describe, expect, it } from 'vitest';
import { RulesCatalog } from './catalog';
import { AbilityScores, CharacterDraft } from './models';
import {
  asiSlots,
  classResources,
  derive,
  experienceForLevel,
  growthChoicesComplete,
  homebrewAbilityScore,
  isRecommendedClass,
  maximumHp,
  maximumSpellLevel,
  modifier,
  pointBuyCost,
  proficiency,
  spellSlots,
} from './rules';

const catalog: RulesCatalog = {
  equipment: [
    {
      id: 'scale-mail',
      name: 'Corazza di scaglie',
      category: 'armor',
      group: 'Armature medie',
      cost: '50 mo',
      weightKg: 20.4,
      source: 'SRD',
      armorType: 'medium',
      armorClass: 14,
      dexterityBonus: 'max-2',
    },
    {
      id: 'shield',
      name: 'Scudo',
      category: 'armor',
      group: 'Scudi',
      cost: '10 mo',
      weightKg: 2.7,
      source: 'SRD',
      armorType: 'shield',
      armorClass: 2,
    },
  ],
  ancestries: [
    {
      id: 'tiefling',
      name: 'Tiefling',
      race: 'Tiefling',
      description: '',
      source: 'PHB',
      bonuses: { int: 1, cha: 2 },
      speed: 9,
      traits: [],
      languages: ['Comune', 'Infernale'],
    },
    {
      id: 'human-variant',
      name: 'Umano Variante',
      race: 'Umano',
      description: '',
      source: 'PHB',
      bonuses: {},
      speed: 9,
      traits: [],
      languages: ['Comune'],
      flexibleBonusCount: 2,
      bonusFeat: true,
    },
    {
      id: 'half-elf',
      name: 'Mezzelfo',
      race: 'Mezzelfo',
      description: '',
      source: 'PHB',
      bonuses: { cha: 2 },
      speed: 9,
      traits: [],
      languages: ['Comune', 'Elfico'],
      flexibleBonusCount: 2,
      flexibleBonusOptions: ['str', 'dex', 'con', 'int', 'wis'],
      skillChoices: 2,
      skillChoiceOptions: ['perception', 'persuasion'],
    },
    {
      id: 'dwarf-mountain',
      name: 'Nano · Montagna',
      race: 'Nano',
      description: '',
      source: 'PHB',
      bonuses: { str: 2, con: 2 },
      speed: 7.5,
      traits: [],
      languages: ['Comune', 'Nanico'],
      toolChoices: 1,
      toolOptions: ['Strumenti da fabbro'],
    },
  ],
  classes: [
    {
      id: 'artificer',
      name: 'Artificiere',
      description: '',
      source: 'TCE',
      hitDie: 8,
      primary: 'int',
      saves: ['con', 'int'],
      subclassLevel: 3,
      subclasses: [],
      skillChoices: 2,
      skillOptions: [],
      armorProficiencies: ['light', 'medium', 'shield'],
      caster: 'half',
    },
    {
      id: 'wizard',
      name: 'Mago',
      description: '',
      source: 'PHB',
      hitDie: 6,
      primary: 'int',
      saves: ['int', 'wis'],
      subclassLevel: 2,
      subclasses: [],
      skillChoices: 2,
      skillOptions: [],
      caster: 'full',
    },
  ],
  backgrounds: [
    { id: 'sage', name: 'Sapiente', description: '', source: 'PHB', skills: ['Arcano', 'Storia'] },
  ],
  feats: [
    {
      id: 'alert',
      name: 'Allerta',
      description: '',
      source: 'PHB',
      effects: { initiativeBonus: 5 },
    },
    {
      id: 'tough',
      name: 'Robusto',
      description: '',
      source: 'PHB',
      effects: { hitPointsPerLevel: 2 },
    },
    {
      id: 'observant',
      name: 'Osservatore',
      description: '',
      source: 'PHB',
      effects: {
        abilityIncrease: { amount: 1, options: ['int', 'wis'] },
        passivePerceptionBonus: 5,
        passiveInvestigationBonus: 5,
      },
    },
  ],
};

const draft: CharacterDraft = {
  schemaVersion: 1,
  id: 'fixture',
  revision: 0,
  updatedAt: '2026-01-01',
  name: 'Nyx',
  abilityMethod: 'point-buy',
  abilities: { str: 8, dex: 14, con: 14, int: 15, wis: 10, cha: 10 },
  ancestryId: 'tiefling',
  classId: 'artificer',
  subclassId: 'Fabbro da Battaglia',
  backgroundId: 'sage',
  level: 5,
  asi: { int: 2 },
  featIds: [],
  spellIds: ['shield'],
  notes: '',
};

describe('regole 5e 2014', () => {
  it('calcola modificatori e competenza', () => {
    expect(modifier(8)).toBe(-1);
    expect(modifier(18)).toBe(4);
    expect(proficiency(5)).toBe(3);
  });
  it('usa la tabella point buy', () =>
    expect(
      [8, 9, 10, 11, 12, 13, 14, 15].reduce((sum, value) => sum + pointBuyCost(value), 0),
    ).toBe(31));
  it('calcola la fixture Tiefling Artefice 5', () => {
    const result = derive(draft, catalog);
    expect(result.finalAbilities.int).toBe(18);
    expect(result.spellAttack).toBe(7);
    expect(result.spellDc).toBe(15);
    expect(result.preparedSpells).toBe(6);
  });
  it('applica le scelte razziali del Mezzelfo e gli strumenti del Nano', () => {
    const halfElf = derive(
      {
        ...draft,
        ancestryId: 'half-elf',
        ancestryBonusAbilities: ['dex', 'wis'],
        ancestrySkillProficiencies: ['perception', 'persuasion'],
        asi: {},
      },
      catalog,
    );
    expect(halfElf.finalAbilities.dex).toBe(15);
    expect(halfElf.finalAbilities.wis).toBe(11);
    expect(halfElf.finalAbilities.cha).toBe(12);
    expect(halfElf.skills.find((skill) => skill.id === 'persuasion')?.proficient).toBe(true);

    const dwarf = derive(
      {
        ...draft,
        ancestryId: 'dwarf-mountain',
        ancestryToolProficiencies: ['Strumenti da fabbro'],
        asi: {},
      },
      catalog,
    );
    expect(dwarf.tools).toContain('Strumenti da fabbro');
  });
  it('gestisce la Sanità mentale homebrew senza applicare bonus razziali', () => {
    const enabled = derive({ ...draft, sanityEnabled: true, sanityScore: 13 }, catalog);
    const disabled = derive({ ...draft, sanityEnabled: false, sanityScore: 13 }, catalog);
    expect(enabled.sanityScore).toBe(13);
    expect(enabled.sanityModifier).toBe(1);
    expect(disabled.sanityScore).toBeUndefined();
    expect(disabled.sanityModifier).toBeUndefined();
  });
  it('limita tutte le caratteristiche homebrew tra 0 e 20', () => {
    expect(homebrewAbilityScore(-4)).toBe(0);
    expect(homebrewAbilityScore(0)).toBe(0);
    expect(homebrewAbilityScore(20)).toBe(20);
    expect(homebrewAbilityScore(24)).toBe(20);
    expect(derive({ ...draft, sanityEnabled: true, sanityScore: 0 }, catalog).sanityModifier).toBe(
      -5,
    );
  });
  it('assegna slot extra al Guerriero', () => expect(asiSlots('fighter', 14)).toBe(5));
  it('calcola PE, carico, abilità e percezione passiva', () => {
    const result = derive({ ...draft, classSkillProficiencies: ['perception'] }, catalog);
    expect(experienceForLevel(5)).toBe(6500);
    expect(result.carryingCapacityKg).toBe(54.4);
    expect(result.skills.find((skill) => skill.id === 'perception')?.value).toBe(3);
    expect(result.passivePerception).toBe(13);
    expect(result.savingThrows.find((save) => save.ability === 'con')?.value).toBe(5);
  });
  it('applica gli effetti numerici dei talenti dai dati', () => {
    const result = derive({ ...draft, featIds: ['alert', 'tough'] }, catalog);
    expect(result.initiative).toBe(7);
    expect(result.maxHp).toBe(48);
  });
  it('applica scelta di caratteristica e passive di Osservatore', () => {
    const result = derive(
      {
        ...draft,
        asi: {},
        featIds: ['observant'],
        featAbilityChoices: { observant: 'wis' },
      },
      catalog,
    );
    expect(result.finalAbilities.wis).toBe(11);
    expect(result.passivePerception).toBe(15);
    expect(result.passiveInvestigation).toBe(18);
  });
  it('scala le risorse distintive di classe', () => {
    expect(classResources('barbarian', 17)[0].value).toBe('6');
    expect(classResources('rogue', 9)[0].value).toBe('5d6');
    expect(classResources('monk', 11).find((item) => item.name === 'Punti ki')?.value).toBe('11');
  });
  it('limita gli incantesimi in base alla progressione della classe', () => {
    expect(maximumSpellLevel('wizard', 5)).toBe(3);
    expect(maximumSpellLevel('paladin', 5)).toBe(2);
    expect(maximumSpellLevel('ranger', 1)).toBe(0);
    expect(maximumSpellLevel('warlock', 11)).toBe(6);
    expect(maximumSpellLevel('artificer', 1)).toBe(1);
    expect(maximumSpellLevel('artificer', 13)).toBe(4);
    expect(maximumSpellLevel('artificer', 17)).toBe(5);
    expect(maximumSpellLevel('fighter', 20)).toBe(0);
  });
  it('mostra gli slot corretti per livello e classe', () => {
    expect(spellSlots('wizard', 5).map(({ slots }) => slots)).toEqual([4, 3, 2]);
    expect(spellSlots('paladin', 5).map(({ slots }) => slots)).toEqual([4, 2]);
    expect(spellSlots('artificer', 1).map(({ slots }) => slots)).toEqual([2]);
    expect(spellSlots('ranger', 1)).toEqual([]);
    expect(spellSlots('warlock', 11)).toEqual([
      { level: 5, slots: 3, kind: 'pact' },
      { level: 6, slots: 1, kind: 'arcanum' },
    ]);
  });
  it('calcola CA e peso dello zaino con armatura e scudo', () => {
    const result = derive(
      {
        ...draft,
        equippedArmorId: 'scale-mail',
        shieldEquipped: true,
        inventory: [
          { equipmentId: 'scale-mail', quantity: 1 },
          { equipmentId: 'shield', quantity: 1 },
        ],
      },
      catalog,
    );
    expect(result.armorClass).toBe(18);
    expect(result.armorProficient).toBe(true);
    expect(result.inventoryWeightKg).toBe(23.1);
  });
});

describe('scelta dei punti ferita', () => {
  it('usa il valore medio dopo il primo livello', () =>
    expect(maximumHp({ ...draft, hpMethod: 'average' }, 8, 2)).toBe(38));
  it('somma i risultati dei dadi e il modificatore di Costituzione', () =>
    expect(maximumHp({ ...draft, hpMethod: 'roll', hpRolls: [8, 1, 4, 6] }, 8, 2)).toBe(37));
  it('rispetta il totale inserito manualmente', () =>
    expect(maximumHp({ ...draft, hpMethod: 'manual', manualHp: 42 }, 8, 2)).toBe(42));
});

describe('ASI e talenti', () => {
  it('al livello 4 accetta un ASI completo oppure un talento', () => {
    const level4 = { ...draft, level: 4, asi: {}, featIds: [] };
    expect(growthChoicesComplete({ ...level4, asi: { str: 2 } }, catalog)).toBe(true);
    expect(growthChoicesComplete({ ...level4, asi: { str: 1, dex: 1 } }, catalog)).toBe(true);
    expect(growthChoicesComplete({ ...level4, featIds: ['alert'] }, catalog)).toBe(true);
    expect(growthChoicesComplete({ ...level4, featIds: ['observant'] }, catalog)).toBe(false);
    expect(
      growthChoicesComplete(
        {
          ...level4,
          featIds: ['observant'],
          featAbilityChoices: { observant: 'wis' },
        },
        catalog,
      ),
    ).toBe(true);
  });
  it('al livello 4 rifiuta ASI e talento insieme o un ASI incompleto', () => {
    const level4 = { ...draft, level: 4, asi: {}, featIds: [] };
    expect(growthChoicesComplete({ ...level4, asi: { str: 2 }, featIds: ['alert'] }, catalog)).toBe(
      false,
    );
    expect(growthChoicesComplete({ ...level4, asi: { str: 1 } }, catalog)).toBe(false);
  });
  it('usa le progressioni speciali di Guerriero e Ladro', () => {
    expect(asiSlots('fighter', 20)).toBe(7);
    expect(asiSlots('rogue', 20)).toBe(6);
    expect(asiSlots('wizard', 20)).toBe(5);
  });
  it('concede all’Umano Variante un talento separato dagli ASI di classe', () => {
    const human = { ...draft, ancestryId: 'human-variant', level: 1, asi: {}, featIds: [] };
    expect(growthChoicesComplete(human, catalog)).toBe(false);
    expect(growthChoicesComplete({ ...human, featIds: ['alert'] }, catalog)).toBe(true);
    expect(
      growthChoicesComplete({ ...human, level: 4, featIds: ['alert'], asi: { int: 2 } }, catalog),
    ).toBe(true);
    expect(
      growthChoicesComplete(
        { ...human, level: 4, featIds: ['alert', 'tough'], asi: { int: 2 } },
        catalog,
      ),
    ).toBe(false);
  });
});

describe('classi consigliate', () => {
  it('usa nell’ordine le due caratteristiche più alte', () => {
    const scores: AbilityScores = { str: 8, dex: 13, con: 15, int: 17, wis: 10, cha: 12 };
    expect(isRecommendedClass('artificer', scores)).toBe(true);
    expect(isRecommendedClass('wizard', scores)).toBe(true);
    expect(isRecommendedClass('rogue', scores)).toBe(false);
  });
  it('gestisce le alternative di Guerriero, Ladro e Mago', () => {
    expect(
      isRecommendedClass('fighter', { str: 10, dex: 17, con: 15, int: 8, wis: 12, cha: 9 }),
    ).toBe(true);
    expect(
      isRecommendedClass('rogue', { str: 8, dex: 17, con: 10, int: 12, wis: 9, cha: 15 }),
    ).toBe(true);
    expect(
      isRecommendedClass('wizard', { str: 8, dex: 15, con: 12, int: 17, wis: 10, cha: 9 }),
    ).toBe(true);
  });
  it('non elimina suggerimenti validi in caso di pareggio', () => {
    const scores: AbilityScores = { str: 16, dex: 10, con: 14, int: 8, wis: 14, cha: 9 };
    expect(isRecommendedClass('barbarian', scores)).toBe(true);
    expect(isRecommendedClass('paladin', scores)).toBe(false);
  });
});
