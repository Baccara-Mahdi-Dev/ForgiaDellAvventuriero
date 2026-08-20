import {
  ABILITIES,
  SKILLS,
  AbilityKey,
  AbilityScores,
  CharacterDraft,
  ClassResource,
  DerivedCharacter,
  HOMEBREW_ABILITY_MAX,
  HOMEBREW_ABILITY_MIN,
  SpellSlot,
} from './models';
import { RulesCatalog } from './catalog';
export const pointBuyCost = (score: number): number =>
  (({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }) as Record<number, number>)[score] ??
  99;
export const modifier = (score: number): number => Math.floor((score - 10) / 2);
export const homebrewAbilityScore = (score: number | undefined, fallback = 8): number =>
  Math.max(HOMEBREW_ABILITY_MIN, Math.min(HOMEBREW_ABILITY_MAX, Math.floor(score ?? fallback)));
export const proficiency = (level: number): number => Math.ceil(level / 4) + 1;
export function maximumSpellLevel(classId: string, level: number): number {
  if (classId === 'warlock') {
    if (level >= 17) return 9;
    if (level >= 15) return 8;
    if (level >= 13) return 7;
    if (level >= 11) return 6;
    if (level >= 9) return 5;
    return Math.max(1, Math.ceil(level / 2));
  }
  if (['paladin', 'ranger'].includes(classId))
    return level < 2 ? 0 : Math.min(5, Math.floor((level - 1) / 4) + 1);
  if (classId === 'artificer') return Math.min(5, Math.floor((Math.max(1, level) - 1) / 4) + 1);
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(classId))
    return Math.min(9, Math.ceil(level / 2));
  return 0;
}
const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
] as const;

export function spellSlots(classId: string, level: number): SpellSlot[] {
  const safeLevel = Math.max(1, Math.min(20, level));
  if (classId === 'warlock') {
    const pactLevel = safeLevel >= 9 ? 5 : Math.ceil(safeLevel / 2);
    const pactSlots = safeLevel === 1 ? 1 : safeLevel < 11 ? 2 : safeLevel < 17 ? 3 : 4;
    const result: SpellSlot[] = [{ level: pactLevel, slots: pactSlots, kind: 'pact' }];
    [6, 7, 8, 9].forEach((spellLevel, index) => {
      if (safeLevel >= 11 + index * 2)
        result.push({ level: spellLevel, slots: 1, kind: 'arcanum' });
    });
    return result;
  }
  let casterLevel = 0;
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(classId)) casterLevel = safeLevel;
  if (['paladin', 'ranger'].includes(classId))
    casterLevel = safeLevel < 2 ? 0 : Math.ceil(safeLevel / 2);
  if (classId === 'artificer') casterLevel = Math.ceil(safeLevel / 2);
  return (FULL_CASTER_SLOTS[casterLevel] ?? []).map((slots, index) => ({
    level: index + 1,
    slots,
    kind: 'standard',
  }));
}
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
] as const;
export const experienceForLevel = (level: number): number =>
  XP_THRESHOLDS[Math.max(0, Math.min(19, level - 1))];
export const asiSlots = (classId: string, level: number): number =>
  [4, 8, 12, 16, 19].filter((v) => v <= level).length +
  (classId === 'fighter' ? [6, 14].filter((v) => v <= level).length : 0) +
  (classId === 'rogue' && level >= 10 ? 1 : 0);
export const racialFeatSlots = (ancestryId: string): number =>
  ancestryId === 'human-variant' ? 1 : 0;
export function featEffectTotals(draft: CharacterDraft, catalog: RulesCatalog) {
  const selected = catalog.feats.filter((feat) => draft.featIds.includes(feat.id));
  const abilityBonuses = {} as Partial<AbilityScores>;
  let hitPointsPerLevel = 0,
    initiativeBonus = 0,
    passivePerceptionBonus = 0,
    passiveInvestigationBonus = 0;
  for (const feat of selected) {
    const effects = feat.effects;
    if (!effects) continue;
    const ability = draft.featAbilityChoices?.[feat.id];
    if (ability && effects.abilityIncrease?.options.includes(ability))
      abilityBonuses[ability] = (abilityBonuses[ability] ?? 0) + effects.abilityIncrease.amount;
    hitPointsPerLevel += effects.hitPointsPerLevel ?? 0;
    initiativeBonus += effects.initiativeBonus ?? 0;
    passivePerceptionBonus += effects.passivePerceptionBonus ?? 0;
    passiveInvestigationBonus += effects.passiveInvestigationBonus ?? 0;
  }
  return {
    abilityBonuses,
    hitPointsPerLevel,
    initiativeBonus,
    passivePerceptionBonus,
    passiveInvestigationBonus,
  };
}
export const asiPointTotal = (draft: CharacterDraft): number =>
  Object.values(draft.asi).reduce((sum, value) => sum + (value ?? 0), 0);
export const classChoicesUsed = (draft: CharacterDraft): number =>
  Math.max(0, draft.featIds.length - racialFeatSlots(draft.ancestryId)) +
  Math.ceil(asiPointTotal(draft) / 2);
export const CLASS_ABILITY_PRIORITIES: Readonly<
  Record<string, readonly [readonly AbilityKey[], readonly AbilityKey[]]>
> = {
  artificer: [['int'], ['con']],
  barbarian: [['str'], ['con']],
  bard: [['cha'], ['dex']],
  cleric: [['wis'], ['con']],
  druid: [['wis'], ['con']],
  fighter: [['str', 'dex'], ['con']],
  rogue: [['dex'], ['int', 'cha']],
  wizard: [['int'], ['con', 'dex']],
  monk: [['dex'], ['wis']],
  paladin: [['str'], ['cha']],
  ranger: [['dex'], ['wis']],
  sorcerer: [['cha'], ['con']],
  warlock: [['cha'], ['con']],
};
export function isRecommendedClass(classId: string, scores: AbilityScores): boolean {
  const priorities = CLASS_ABILITY_PRIORITIES[classId];
  if (!priorities) return false;
  const highest = Math.max(...ABILITIES.map(({ key }) => scores[key]));
  return priorities[0].some(
    (primary) =>
      scores[primary] === highest &&
      priorities[1].some(
        (secondary) =>
          secondary !== primary &&
          scores[secondary] ===
            Math.max(
              ...ABILITIES.filter(({ key }) => key !== primary).map(({ key }) => scores[key]),
            ),
      ),
  );
}
export function growthChoicesComplete(draft: CharacterDraft, catalog: RulesCatalog): boolean {
  const points = asiPointTotal(draft),
    racialFeats = racialFeatSlots(draft.ancestryId),
    ancestry = catalog.ancestries.find((x) => x.id === draft.ancestryId),
    featEffects = featEffectTotals(draft, catalog),
    featChoicesComplete = catalog.feats
      .filter((feat) => draft.featIds.includes(feat.id) && feat.effects?.abilityIncrease)
      .every((feat) => {
        const choice = draft.featAbilityChoices?.[feat.id];
        return !!choice && feat.effects!.abilityIncrease!.options.includes(choice);
      });
  const scoresValid = ABILITIES.every(
    ({ key }) =>
      draft.abilities[key] +
        (ancestry?.bonuses[key] ?? 0) +
        ((draft.ancestryBonusAbilities ?? []).includes(key) &&
        (!ancestry?.flexibleBonusOptions || ancestry.flexibleBonusOptions.includes(key))
          ? 1
          : 0) +
        (draft.asi[key] ?? 0) +
        (featEffects.abilityBonuses[key] ?? 0) <=
      20,
  );
  return (
    draft.featIds.length >= racialFeats &&
    points % 2 === 0 &&
    classChoicesUsed(draft) === asiSlots(draft.classId, draft.level) &&
    featChoicesComplete &&
    scoresValid
  );
}
export function maximumHp(
  draft: CharacterDraft,
  hitDie: number,
  constitutionModifier: number,
  hitPointsPerLevel = 0,
): number {
  if (draft.hpMethod === 'manual') return Math.max(1, Math.floor(draft.manualHp ?? 1));
  const gains =
    draft.hpMethod === 'roll'
      ? (draft.hpRolls ?? []).slice(0, Math.max(0, draft.level - 1))
      : Array.from({ length: Math.max(0, draft.level - 1) }, () => Math.floor(hitDie / 2) + 1);
  const rolledOrAverage = gains.reduce(
    (sum, value) => sum + Math.max(1, Math.min(hitDie, Math.floor(value)) + constitutionModifier),
    0,
  );
  return (
    Math.max(1, hitDie + constitutionModifier) + rolledOrAverage + draft.level * hitPointsPerLevel
  );
}
export function classResources(
  classId: string,
  level: number,
  chaModifier = 0,
  intModifier = 0,
  subclassId = '',
): ClassResource[] {
  const at = (values: readonly [number, string][]) =>
    [...values].reverse().find(([minimum]) => level >= minimum)?.[1] ?? '—';
  switch (classId) {
    case 'barbarian':
      return [
        {
          name: 'Ire',
          value:
            level >= 20
              ? 'Illimitate'
              : at([
                  [1, '2'],
                  [3, '3'],
                  [6, '4'],
                  [12, '5'],
                  [17, '6'],
                ]),
        },
        {
          name: 'Danni dell’ira',
          value: at([
            [1, '+2'],
            [9, '+3'],
            [16, '+4'],
          ]),
        },
      ];
    case 'bard':
      return [
        {
          name: 'Ispirazione bardica',
          value: `${Math.max(1, chaModifier)} × d${at([
            [1, '6'],
            [5, '8'],
            [10, '10'],
            [15, '12'],
          ])}`,
          detail: level >= 5 ? 'Recupero con riposo breve o lungo' : 'Recupero con riposo lungo',
        },
      ];
    case 'cleric':
      return level < 2
        ? []
        : [
            {
              name: 'Incanalare Divinità',
              value: at([
                [2, '1 uso'],
                [6, '2 usi'],
                [18, '3 usi'],
              ]),
              detail: 'Recupero con riposo breve o lungo',
            },
          ];
    case 'druid':
      return level < 2
        ? []
        : [
            {
              name: 'Forma Selvatica',
              value: level >= 20 ? 'Illimitata' : '2 usi',
              detail: `GS massimo ${at([
                [2, '1/4'],
                [4, '1/2'],
                [8, '1'],
              ])} · recupero con riposo breve o lungo`,
            },
          ];
    case 'fighter': {
      const resources: ClassResource[] = [];
      if (level >= 1)
        resources.push({
          name: 'Recuperare Energie',
          value: '1 uso',
          detail: 'Riposo breve o lungo',
        });
      if (level >= 2)
        resources.push({
          name: 'Azione Impetuosa',
          value: level >= 17 ? '2 usi' : '1 uso',
          detail: 'Riposo breve o lungo',
        });
      if (level >= 9)
        resources.push({
          name: 'Indomito',
          value: at([
            [9, '1 uso'],
            [13, '2 usi'],
            [17, '3 usi'],
          ]),
          detail: 'Riposo lungo',
        });
      if (subclassId === 'Maestro di Battaglia' && level >= 3)
        resources.push({
          name: 'Dadi di superiorità',
          value: `${at([
            [3, '4'],
            [7, '5'],
            [15, '6'],
          ])}d${at([
            [3, '8'],
            [10, '10'],
            [18, '12'],
          ])}`,
        });
      return resources;
    }
    case 'monk': {
      const resources: ClassResource[] = [
        {
          name: 'Arti marziali',
          value: `d${at([
            [1, '4'],
            [5, '6'],
            [11, '8'],
            [17, '10'],
          ])}`,
        },
      ];
      if (level >= 2)
        resources.push({
          name: 'Punti ki',
          value: String(level),
          detail: 'Recupero con riposo breve o lungo',
        });
      return resources;
    }
    case 'rogue':
      return [{ name: 'Attacco furtivo', value: `${Math.ceil(level / 2)}d6` }];
    case 'paladin': {
      const resources: ClassResource[] = [
        { name: 'Imposizione delle mani', value: `${level * 5} PF` },
      ];
      if (level >= 3)
        resources.push({
          name: 'Incanalare Divinità',
          value: '1 uso',
          detail: 'Riposo breve o lungo',
        });
      if (level >= 14)
        resources.push({
          name: 'Tocco purificatore',
          value: `${Math.max(1, chaModifier)} usi`,
          detail: 'Riposo lungo',
        });
      return resources;
    }
    case 'ranger':
      return level >= 1
        ? [
            {
              name: 'Nemico prescelto',
              value: at([
                [1, '1 tipo'],
                [6, '2 tipi'],
                [14, '3 tipi'],
              ]),
            },
          ]
        : [];
    case 'sorcerer':
      return level >= 2
        ? [{ name: 'Punti stregoneria', value: String(level), detail: 'Recupero con riposo lungo' }]
        : [];
    case 'warlock':
      return [
        {
          name: 'Slot del Patto',
          value: at([
            [1, '1'],
            [2, '2'],
            [11, '3'],
            [17, '4'],
          ]),
          detail: `Livello slot ${at([
            [1, '1°'],
            [3, '2°'],
            [5, '3°'],
            [7, '4°'],
            [9, '5°'],
          ])} · riposo breve o lungo`,
        },
      ];
    case 'wizard':
      return [
        {
          name: 'Recupero Arcano',
          value: `${Math.ceil(level / 2)} livelli di slot`,
          detail: 'Una volta al giorno dopo un riposo breve',
        },
      ];
    case 'artificer': {
      const resources: ClassResource[] = [
        { name: 'Congegno magico', value: `${Math.max(1, intModifier)} oggetti` },
      ];
      if (level >= 2)
        resources.push({
          name: 'Infusioni attive',
          value: at([
            [2, '2'],
            [6, '3'],
            [10, '4'],
            [14, '5'],
            [18, '6'],
          ]),
        });
      return resources;
    }
    default:
      return [];
  }
}
export function derive(draft: CharacterDraft, catalog: RulesCatalog): DerivedCharacter {
  const ancestry = catalog.ancestries.find((x) => x.id === draft.ancestryId),
    klass = catalog.classes.find((x) => x.id === draft.classId),
    background = catalog.backgrounds.find((x) => x.id === draft.backgroundId),
    finalAbilities = {} as AbilityScores,
    featEffects = featEffectTotals(draft, catalog);
  for (const { key } of ABILITIES)
    finalAbilities[key] = Math.min(
      20,
      draft.abilities[key] +
        (ancestry?.bonuses[key] ?? 0) +
        ((draft.ancestryBonusAbilities ?? []).includes(key) &&
        (!ancestry?.flexibleBonusOptions || ancestry.flexibleBonusOptions.includes(key))
          ? 1
          : 0) +
        (draft.asi[key] ?? 0) +
        (featEffects.abilityBonuses[key] ?? 0),
    );
  const modifiers = Object.fromEntries(
      ABILITIES.map(({ key }) => [key, modifier(finalAbilities[key])]),
    ) as AbilityScores,
    pb = proficiency(draft.level),
    caster = klass?.caster ? modifiers[klass.primary] : undefined,
    equippedArmor = catalog.equipment.find((item) => item.id === draft.equippedArmorId),
    armorTypes = new Set([
      ...(klass?.armorProficiencies ?? []),
      ...(ancestry?.armorProficiencies ?? []),
    ]),
    armorProficient =
      !equippedArmor ||
      equippedArmor.armorType === 'clothing' ||
      (!!equippedArmor.armorType && armorTypes.has(equippedArmor.armorType)) ||
      (equippedArmor.armorType === 'heavy' &&
        ((draft.classId === 'cleric' &&
          ['Dominio della Vita', 'Dominio della Guerra'].includes(draft.subclassId)) ||
          (draft.classId === 'artificer' && draft.subclassId === 'Armorer' && draft.level >= 3))) ||
      ((equippedArmor.armorType === 'medium' || equippedArmor.armorType === 'shield') &&
        draft.classId === 'bard' &&
        draft.subclassId === 'Collegio del Valore' &&
        draft.level >= 3),
    armorBase = equippedArmor?.armorClass ?? 10,
    armorDex =
      equippedArmor?.dexterityBonus === 'none'
        ? 0
        : equippedArmor?.dexterityBonus === 'max-2'
          ? Math.min(2, modifiers.dex)
          : modifiers.dex,
    shieldBonus = draft.shieldEquipped ? 2 : 0,
    inventoryWeightKg = +(draft.inventory ?? [])
      .reduce((sum, entry) => {
        const item = catalog.equipment.find((candidate) => candidate.id === entry.equipmentId);
        return sum + (item?.weightKg ?? 0) * Math.max(0, entry.quantity);
      }, 0)
      .toFixed(1);
  const pickedSkillIds = [
      ...(draft.classSkillProficiencies ?? []),
      ...(draft.ancestrySkillProficiencies ?? []),
      ...(ancestry?.skillProficiencies ?? []),
    ],
    proficientNames = new Set([
      ...(background?.skills ?? []),
      ...SKILLS.filter((skill) => pickedSkillIds.includes(skill.id)).map((skill) => skill.name),
    ]),
    skills = SKILLS.map((skill) => ({
      ...skill,
      proficient: proficientNames.has(skill.name),
      value: modifiers[skill.ability] + (proficientNames.has(skill.name) ? pb : 0),
    })),
    perception = skills.find((skill) => skill.id === 'perception')!,
    investigation = skills.find((skill) => skill.id === 'investigation')!,
    savingThrows = ABILITIES.map((ability) => ({
      ability: ability.key,
      name: ability.label,
      proficient: klass?.saves.includes(ability.key) ?? false,
      value: modifiers[ability.key] + (klass?.saves.includes(ability.key) ? pb : 0),
    }));
  const languages = [
      ...(ancestry?.languages ?? []),
      ...(background?.languages ?? []),
      ...(draft.customLanguages ?? []),
    ].filter((value, index, all) => value && all.indexOf(value) === index),
    tools = [
      ...(ancestry?.tools ?? []),
      ...(draft.ancestryToolProficiencies ?? []),
      ...(background?.tools ?? []),
      ...(draft.customTools ?? []),
    ].filter((value, index, all) => value && all.indexOf(value) === index);
  return {
    finalAbilities,
    modifiers,
    sanityScore: draft.sanityEnabled ? homebrewAbilityScore(draft.sanityScore) : undefined,
    sanityModifier: draft.sanityEnabled
      ? modifier(homebrewAbilityScore(draft.sanityScore))
      : undefined,
    proficiency: pb,
    armorClass: armorBase + armorDex + shieldBonus,
    initiative: modifiers.dex + featEffects.initiativeBonus,
    maxHp: klass
      ? maximumHp(
          draft,
          klass.hitDie,
          modifiers.con,
          featEffects.hitPointsPerLevel + (ancestry?.hitPointsPerLevel ?? 0),
        )
      : 0,
    experience: experienceForLevel(draft.level),
    passivePerception: 10 + perception.value + featEffects.passivePerceptionBonus,
    passiveInvestigation: 10 + investigation.value + featEffects.passiveInvestigationBonus,
    savingThrows,
    speedMeters: ancestry?.speed ?? 0,
    size: ancestry?.size ?? 'Media',
    hitDie: klass?.hitDie ?? 0,
    hitDiceRemaining: Math.max(0, draft.level - (draft.hitDiceSpent ?? 0)),
    carryingCapacityKg: +(
      finalAbilities.str *
      15 *
      0.45359237 *
      (ancestry?.powerfulBuild ? 2 : 1)
    ).toFixed(1),
    moveCapacityKg: +(
      finalAbilities.str *
      30 *
      0.45359237 *
      (ancestry?.powerfulBuild ? 2 : 1)
    ).toFixed(1),
    inventoryWeightKg,
    armorProficient,
    skills,
    languages,
    tools,
    armorProficiencies: [...new Set(klass?.armorProficiencies ?? [])],
    weaponProficiencies: [
      ...new Set([...(klass?.weaponProficiencies ?? []), ...(ancestry?.weaponProficiencies ?? [])]),
    ],
    resistances: ancestry?.resistances ?? [],
    senses: ancestry?.darkvisionMeters ? [`Scurovisione ${ancestry.darkvisionMeters} m`] : [],
    classResources: classResources(
      draft.classId,
      draft.level,
      modifiers.cha,
      modifiers.int,
      draft.subclassId,
    ),
    spellAttack: caster === undefined ? undefined : pb + caster,
    spellDc: caster === undefined ? undefined : 8 + pb + caster,
    preparedSpells: klass?.caster
      ? Math.max(
          1,
          modifiers[klass.primary] +
            (klass.caster === 'half' ? Math.floor(draft.level / 2) : draft.level),
        )
      : 0,
    completed: [
      true,
      !!draft.ancestryId,
      !!draft.classId,
      !!draft.backgroundId,
      !!draft.alignment,
      draft.level > 0,
      growthChoicesComplete(draft, catalog),
      !!draft.name,
    ].filter(Boolean).length,
  };
}
export function featEligible(id: string, draft: CharacterDraft, catalog: RulesCatalog): boolean {
  const feat = catalog.feats.find((x) => x.id === id);
  if (!feat) return false;
  const requirements = feat.requirements;
  if (!requirements) return true;
  const d = derive(draft, catalog);
  if ((requirements.minimumLevel ?? 0) > draft.level) return false;
  if (requirements.spellcasting && !catalog.classes.find((x) => x.id === draft.classId)?.caster)
    return false;
  if (requirements.ancestryIds && !requirements.ancestryIds.includes(draft.ancestryId))
    return false;
  if (
    requirements.anyAbility &&
    !requirements.anyAbility.abilities.some(
      (ability) => d.finalAbilities[ability] >= requirements.anyAbility!.minimum,
    )
  )
    return false;
  return true;
}
