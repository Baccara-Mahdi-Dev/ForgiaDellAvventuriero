import {
  ABILITIES,
  SKILLS,
  AbilityKey,
  AbilityScores,
  CharacterClass,
  CharacterDraft,
  ClassResource,
  DerivedCharacter,
  HOMEBREW_ABILITY_MAX,
  HOMEBREW_ABILITY_MIN,
  SpellSlot,
} from './models';
import { RulesCatalog } from './catalog';
import {
  activeEquipmentEffects,
  equipmentAbilityBonuses,
  equipmentAbilityMinimum,
  equipmentEffectTotal,
} from './equipment-effects';
import { resolveWeaponBase } from './weapon-loadout';
import { attunementLimit, isArtificerSubclass } from './artificer-rules';
import { activeClassFeatureChoices } from './class-progression';
export const pointBuyCost = (score: number): number =>
  (({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }) as Record<number, number>)[score] ??
  99;
export const modifier = (score: number): number => Math.floor((score - 10) / 2);
export const homebrewAbilityScore = (score: number | undefined, fallback = 8): number =>
  Math.max(HOMEBREW_ABILITY_MIN, Math.min(HOMEBREW_ABILITY_MAX, Math.floor(score ?? fallback)));
export const proficiency = (level: number): number => Math.ceil(level / 4) + 1;

const ARTIFICER_TOOL_NAMES: Readonly<Record<string, string>> = {
  alchemist: 'Scorte da alchimista',
  brewer: 'Scorte da birraio',
  calligrapher: 'Scorte da calligrafo',
  carpenter: 'Strumenti da carpentiere',
  cartographer: 'Strumenti da cartografo',
  cobbler: 'Strumenti da calzolaio',
  cook: 'Utensili da cuoco',
  glassblower: 'Strumenti da soffiatore di vetro',
  jeweler: 'Strumenti da gioielliere',
  leatherworker: 'Strumenti da conciatore',
  mason: 'Strumenti da muratore',
  painter: 'Scorte da pittore',
  potter: 'Strumenti da vasaio',
  smith: 'Strumenti da fabbro',
  tinkerer: 'Strumenti da inventore',
  weaver: 'Strumenti da tessitore',
  woodcarver: 'Strumenti da intagliatore',
};

/** Competenze negli strumenti ottenute dalla classe, prima di applicare il background. */
export function classToolProficiencies(draft: CharacterDraft, klass?: CharacterClass): string[] {
  const selectedTools = activeClassFeatureChoices(
    klass,
    draft.level,
    draft.subclassId,
    draft.classFeatureChoices,
  ).flatMap((choice) => {
    if (choice.effect !== 'tool-proficiency') return [];
    const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
    return choice.options.filter((option) => selected.has(option.id)).map((option) => option.name);
  });
  return [
    ...(draft.classId === 'rogue' ? ['Arnesi da scasso'] : []),
    ...(draft.classId === 'artificer' ? ['Arnesi da scasso', 'Strumenti da inventore'] : []),
    ...(draft.classFeatureChoices?.['artificer-artisan-tool'] ?? []).flatMap((id) =>
      ARTIFICER_TOOL_NAMES[id] ? [ARTIFICER_TOOL_NAMES[id]] : [],
    ),
    ...(isArtificerSubclass(draft, 'alchemist') ? ['Scorte da alchimista'] : []),
    ...(isArtificerSubclass(draft, 'artillerist') ? ['Strumenti da intagliatore'] : []),
    ...(isArtificerSubclass(draft, 'armorer') || isArtificerSubclass(draft, 'battleSmith')
      ? ['Strumenti da fabbro']
      : []),
    ...(draft.classId === 'rogue' && draft.level >= 3 && draft.subclassId === 'Assassino'
      ? ['Kit da camuffamento', 'Scorte da avvelenatore']
      : []),
    ...(draft.classId === 'rogue' && draft.level >= 3 && draft.subclassId === 'Pianificatore'
      ? ['Kit da camuffamento', 'Strumenti da falsario']
      : []),
    ...(draft.classId === 'monk' &&
    draft.level >= 3 &&
    draft.subclassId === 'Via del Maestro Ubriaco'
      ? ['Scorte da birraio']
      : []),
    ...(draft.classId === 'monk' &&
    draft.level >= 3 &&
    draft.subclassId === 'Via della Misericordia'
      ? ['Borsa da erborista']
      : []),
    ...(draft.classId === 'fighter' &&
    draft.level >= 3 &&
    draft.subclassId === 'Cavaliere delle Rune'
      ? ['Strumenti da fabbro']
      : []),
    ...selectedTools,
  ].filter((value, index, all) => all.indexOf(value) === index);
}

export interface SpellSelectionLimits {
  cantrips: number;
  leveledSpells: number;
}

export interface SubclassSpellcastingProfile extends SpellSelectionLimits {
  spellClassId: string;
  ability: AbilityKey;
  schools: string[];
  unrestrictedLeveledSpells: number;
}

const THIRD_CASTER_SPELLS = [
  0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13,
] as const;

export function subclassSpellcastingProfile(
  classId: string,
  subclassId: string,
  level: number,
): SubclassSpellcastingProfile | undefined {
  const safeLevel = Math.max(1, Math.min(20, level));
  const schools =
    classId === 'fighter' && subclassId === 'Cavaliere Mistico'
      ? ['Abiurazione', 'Invocazione']
      : classId === 'rogue' && subclassId === 'Mistificatore Arcano'
        ? ['Ammaliamento', 'Illusione']
        : undefined;
  if (!schools || safeLevel < 3) return undefined;
  return {
    spellClassId: 'wizard',
    ability: 'int',
    schools,
    cantrips: classId === 'rogue' ? (safeLevel >= 10 ? 3 : 2) : 2,
    leveledSpells: byLevel(THIRD_CASTER_SPELLS, safeLevel),
    unrestrictedLeveledSpells: 1 + [8, 14, 20].filter((threshold) => safeLevel >= threshold).length,
  };
}

const byLevel = (values: readonly number[], level: number): number =>
  values[Math.max(0, Math.min(19, level - 1))] ?? 0;

const BARD_SPELLS = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22,
] as const;
const RANGER_SPELLS = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11] as const;
const SORCERER_SPELLS = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15,
] as const;
const WARLOCK_SPELLS = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 12, 12, 14, 14, 16, 16, 18, 18, 19, 19,
] as const;

/** Limiti di scelta della magia di classe secondo la progressione SRD 5.1. */
export function spellSelectionLimits(
  classId: string,
  level: number,
  spellcastingModifier = 0,
  subclassId = '',
): SpellSelectionLimits {
  const safeLevel = Math.max(1, Math.min(20, level));
  const subclassProfile = subclassSpellcastingProfile(classId, subclassId, safeLevel);
  if (subclassProfile)
    return { cantrips: subclassProfile.cantrips, leveledSpells: subclassProfile.leveledSpells };
  const cantrips =
    classId === 'sorcerer'
      ? safeLevel < 4
        ? 4
        : safeLevel < 10
          ? 5
          : 6
      : ['bard', 'cleric', 'warlock', 'wizard'].includes(classId)
        ? safeLevel < 4
          ? classId === 'cleric' || classId === 'wizard'
            ? 3
            : 2
          : safeLevel < 10
            ? classId === 'cleric' || classId === 'wizard'
              ? 4
              : 3
            : classId === 'cleric' || classId === 'wizard'
              ? 5
              : 4
        : classId === 'druid'
          ? safeLevel < 4
            ? 2
            : safeLevel < 10
              ? 3
              : 4
          : classId === 'artificer'
            ? safeLevel < 10
              ? 2
              : safeLevel < 14
                ? 3
                : 4
            : 0;

  let leveledSpells = 0;
  if (classId === 'bard') leveledSpells = byLevel(BARD_SPELLS, safeLevel);
  else if (classId === 'ranger') leveledSpells = byLevel(RANGER_SPELLS, safeLevel);
  else if (classId === 'sorcerer') leveledSpells = byLevel(SORCERER_SPELLS, safeLevel);
  else if (classId === 'warlock') leveledSpells = byLevel(WARLOCK_SPELLS, safeLevel);
  else if (classId === 'wizard') leveledSpells = 6 + (safeLevel - 1) * 2;
  else if (['cleric', 'druid'].includes(classId))
    leveledSpells = Math.max(1, safeLevel + spellcastingModifier);
  else if (
    ['paladin', 'artificer'].includes(classId) &&
    (classId === 'artificer' || safeLevel >= 2)
  )
    leveledSpells = Math.max(1, Math.floor(safeLevel / 2) + spellcastingModifier);

  return { cantrips, leveledSpells };
}
export function maximumSpellLevel(classId: string, level: number, subclassId = ''): number {
  if (subclassSpellcastingProfile(classId, subclassId, level))
    return Math.min(4, Math.ceil(Math.max(3, level) / 6));
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

export function spellSlots(classId: string, level: number, subclassId = ''): SpellSlot[] {
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
  if (subclassSpellcastingProfile(classId, subclassId, safeLevel))
    casterLevel = Math.ceil(safeLevel / 3);
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
  const armorProficiencies = new Set<string>(),
    toolProficiencies = new Set<string>(),
    skillProficiencyIds = new Set<string>(),
    expertiseIds = new Set<string>(),
    weaponProficiencyIds = new Set<string>(),
    languageProficiencies = new Set<string>(),
    savingThrowProficiencies = new Set<AbilityKey>();
  for (const feat of selected) {
    const effects = feat.effects ?? {};
    const ability = draft.featAbilityChoices?.[feat.id];
    if (ability && effects.abilityIncrease?.options.includes(ability))
      abilityBonuses[ability] = (abilityBonuses[ability] ?? 0) + effects.abilityIncrease.amount;
    if (ability && effects.savingThrowProficiencyFromAbility) savingThrowProficiencies.add(ability);
    for (const armor of effects.armorProficiencies ?? []) armorProficiencies.add(armor);
    for (const tool of effects.toolProficiencies ?? []) toolProficiencies.add(tool);
    for (const weapon of effects.weaponProficiencies ?? []) weaponProficiencyIds.add(weapon);
    for (const choice of feat.proficiencyChoices ?? []) {
      for (const selectedId of draft.featProficiencyChoices?.[choice.id] ?? []) {
        if (choice.kind === 'skill') skillProficiencyIds.add(selectedId);
        else if (choice.kind === 'expertise') expertiseIds.add(selectedId);
        else if (choice.kind === 'tool') toolProficiencies.add(selectedId);
        else if (choice.kind === 'weapon') weaponProficiencyIds.add(selectedId);
        else if (choice.kind === 'language') languageProficiencies.add(selectedId);
        else if (choice.kind === 'skill-or-tool') {
          if (selectedId.startsWith('skill:')) skillProficiencyIds.add(selectedId.slice(6));
          if (selectedId.startsWith('tool:')) toolProficiencies.add(selectedId.slice(5));
        }
      }
    }
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
    armorProficiencies,
    toolProficiencies,
    skillProficiencyIds,
    expertiseIds,
    weaponProficiencyIds,
    languageProficiencies,
    savingThrowProficiencies,
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
    selectedFeats = catalog.feats.filter((feat) => draft.featIds.includes(feat.id)),
    featChoicesComplete = selectedFeats.every((feat) => {
      const choice = draft.featAbilityChoices?.[feat.id];
      const abilityComplete =
        !feat.effects?.abilityIncrease ||
        (!!choice && feat.effects.abilityIncrease.options.includes(choice));
      const proficienciesComplete = (feat.proficiencyChoices ?? []).every(
        (pick) => (draft.featProficiencyChoices?.[pick.id] ?? []).length === pick.count,
      );
      return abilityComplete && proficienciesComplete;
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
      if (level >= 7)
        resources.push({
          name: 'Lampo di genio',
          value: `${Math.max(1, intModifier)} usi`,
          detail: `Bonus +${Math.max(0, intModifier)} · recupero con riposo lungo`,
        });
      if (level >= 10)
        resources.push({
          name: 'Slot di sintonia',
          value: String(attunementLimit({ classId, level })),
          detail:
            level >= 18
              ? 'Maestro degli oggetti magici'
              : level >= 14
                ? 'Sapiente degli oggetti magici'
                : 'Adepto degli oggetti magici',
        });
      if (isArtificerSubclass({ classId, subclassId, level }, 'battleSmith')) {
        resources.push({
          name: 'Difensore d’acciaio',
          value: `${2 + intModifier + level * 5} PF · CA ${level >= 15 ? 17 : 15}`,
          detail: `Squarcio 1d8+${proficiency(level)} forza · Riparazione 3/giorno`,
        });
        if (level >= 9)
          resources.push({
            name: 'Scossa arcana',
            value: `${Math.max(1, intModifier)} usi · ${level >= 15 ? '4d6' : '2d6'}`,
            detail: 'Danni da forza o guarigione · recupero con riposo lungo',
          });
      }
      if (isArtificerSubclass({ classId, subclassId, level }, 'armorer'))
        resources.push({
          name: 'Armatura arcana',
          value: level >= 9 ? '4 parti · +2 infusioni dedicate' : 'Attiva',
          detail: 'Modello Guardiano o Infiltratore · armi dell’armatura basate su INT',
        });
      if (isArtificerSubclass({ classId, subclassId, level }, 'artillerist'))
        resources.push({
          name: 'Cannone mistico',
          value: `${level >= 15 ? '2 cannoni' : '1 cannone'} · ${level >= 9 ? '3d8' : '2d8'}`,
          detail: `CA 18 · ${level * 5} PF${level >= 5 ? ' · Arma da fuoco arcana +1d8' : ''}`,
        });
      if (isArtificerSubclass({ classId, subclassId, level }, 'alchemist'))
        resources.push({
          name: 'Elisir sperimentale',
          value: `${level >= 15 ? '3' : level >= 6 ? '2' : '1'} per riposo lungo`,
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
    backgroundMode = draft.backgroundSelectionMode ?? 'catalog',
    background =
      backgroundMode === 'catalog'
        ? catalog.backgrounds.find((x) => x.id === draft.backgroundId)
        : undefined,
    finalAbilities = {} as AbilityScores,
    featEffects = featEffectTotals(draft, catalog),
    equipmentEffects = activeEquipmentEffects(draft, catalog.equipment),
    equipmentAbilities = equipmentAbilityBonuses(equipmentEffects);
  for (const { key } of ABILITIES)
    finalAbilities[key] = equipmentAbilityMinimum(
      key,
      Math.min(
        20,
        draft.abilities[key] +
          (ancestry?.bonuses[key] ?? 0) +
          ((draft.ancestryBonusAbilities ?? []).includes(key) &&
          (!ancestry?.flexibleBonusOptions || ancestry.flexibleBonusOptions.includes(key))
            ? 1
            : 0) +
          (draft.asi[key] ?? 0) +
          (featEffects.abilityBonuses[key] ?? 0) +
          (equipmentAbilities[key] ?? 0),
      ),
      equipmentEffects,
    );
  const modifiers = Object.fromEntries(
      ABILITIES.map(({ key }) => [key, modifier(finalAbilities[key])]),
    ) as AbilityScores,
    pb = proficiency(draft.level),
    subclassCaster = subclassSpellcastingProfile(draft.classId, draft.subclassId, draft.level),
    caster = klass?.caster
      ? modifiers[klass.primary]
      : subclassCaster
        ? modifiers[subclassCaster.ability]
        : undefined,
    equippedArmor = catalog.equipment.find((item) => item.id === draft.equippedArmorId),
    subclassArmorProficiencies =
      draft.level < (klass?.subclassLevel ?? 21)
        ? []
        : draft.classId === 'cleric' &&
            [
              'Dominio della Guerra',
              'Dominio della Natura',
              'Dominio della Tempesta',
              'Dominio della Vita',
              'Dominio della Forgia',
              "Dominio dell'Ordine",
              'Dominio del Crepuscolo',
              'Dominio della Solidarietà',
              'Dominio della Forza',
              'Dominio dello Zelo',
            ].includes(draft.subclassId)
          ? (['heavy'] as const)
          : draft.classId === 'bard' && draft.subclassId === 'Collegio del Valore'
            ? (['medium', 'shield'] as const)
            : draft.classId === 'warlock' && draft.subclassId === 'La Lama del Sortilegio'
              ? (['medium', 'shield'] as const)
              : isArtificerSubclass(draft, 'armorer')
                ? (['heavy'] as const)
                : [],
    subclassWeaponProficiencies =
      draft.level < (klass?.subclassLevel ?? 21)
        ? []
        : (draft.classId === 'cleric' &&
              [
                'Dominio della Guerra',
                'Dominio della Tempesta',
                'Dominio del Crepuscolo',
                'Dominio dello Zelo',
              ].includes(draft.subclassId)) ||
            (draft.classId === 'bard' && draft.subclassId === 'Collegio del Valore') ||
            (draft.classId === 'warlock' && draft.subclassId === 'La Lama del Sortilegio') ||
            isArtificerSubclass(draft, 'battleSmith')
          ? ['martial']
          : [],
    armorTypes = new Set([
      ...(klass?.armorProficiencies ?? []),
      ...(ancestry?.armorProficiencies ?? []),
      ...subclassArmorProficiencies,
      ...featEffects.armorProficiencies,
    ]),
    armorBase = equippedArmor?.armorClass ?? 10,
    armorDex =
      equippedArmor?.dexterityBonus === 'none'
        ? 0
        : equippedArmor?.dexterityBonus === 'max-2'
          ? Math.min(2, modifiers.dex)
          : modifiers.dex,
    equippedShield = catalog.equipment.find(
      (item) => item.id === (draft.equippedShieldId ?? (draft.shieldEquipped ? 'shield' : '')),
    ),
    unarmoredDefenseModifier =
      draft.level >= 1 && (!equippedArmor || equippedArmor.armorType === 'clothing')
        ? draft.classId === 'barbarian'
          ? modifiers.con
          : draft.classId === 'monk' && !equippedShield
            ? modifiers.wis
            : 0
        : 0,
    armorProficient =
      (!equippedArmor ||
        equippedArmor.armorType === 'clothing' ||
        (!!equippedArmor.armorType && armorTypes.has(equippedArmor.armorType))) &&
      (!equippedShield || armorTypes.has('shield')),
    shieldBonus = equippedShield ? (equippedShield.armorClass ?? 2) : 0,
    armorMagicBonus =
      equippedArmor && !equippedArmor.magical
        ? Math.max(0, Math.min(3, Math.floor(draft.armorMagicBonus ?? 0)))
        : 0,
    shieldMagicBonus =
      equippedShield && !equippedShield.magical
        ? Math.max(0, Math.min(3, Math.floor(draft.shieldMagicBonus ?? 0)))
        : 0,
    armorClassBonus =
      (ancestry?.armorClassBonus ?? 0) + equipmentEffectTotal(equipmentEffects, 'armor-class'),
    initiativeBonus = equipmentEffectTotal(equipmentEffects, 'initiative'),
    savingThrowBonus = equipmentEffectTotal(equipmentEffects, 'saving-throw-bonus'),
    inventoryWeightKg = +(draft.inventory ?? [])
      .reduce((sum, entry) => {
        const rawItem = catalog.equipment.find((candidate) => candidate.id === entry.equipmentId);
        const item =
          rawItem?.category === 'weapon'
            ? resolveWeaponBase(rawItem, catalog.equipment, draft.magicWeaponBaseIds?.[rawItem.id])
            : rawItem;
        return sum + (item?.weightKg ?? 0) * Math.max(0, entry.quantity);
      }, 0)
      .toFixed(1),
    sizeMultiplier = ancestry?.powerfulBuild ? 2 : 1,
    encumberedThresholdKg = +(finalAbilities.str * 2.5 * sizeMultiplier).toFixed(1),
    heavilyEncumberedThresholdKg = +(finalAbilities.str * 5 * sizeMultiplier).toFixed(1),
    carryingCapacityKg = +(finalAbilities.str * 7.5 * sizeMultiplier).toFixed(1),
    moveCapacityKg = +(finalAbilities.str * 15 * sizeMultiplier).toFixed(1),
    encumbrance =
      inventoryWeightKg > carryingCapacityKg
        ? ('over-capacity' as const)
        : inventoryWeightKg > heavilyEncumberedThresholdKg
          ? ('heavily-encumbered' as const)
          : inventoryWeightKg > encumberedThresholdKg
            ? ('encumbered' as const)
            : ('normal' as const),
    encumbranceSpeedPenaltyMeters =
      encumbrance === 'encumbered' ? 3 : encumbrance === 'normal' ? 0 : 6,
    armorStrengthSpeedPenaltyMeters =
      equippedArmor?.armorType === 'heavy' &&
      !!equippedArmor.strengthRequirement &&
      finalAbilities.str < equippedArmor.strengthRequirement &&
      ancestry?.race !== 'Nano'
        ? 3
        : 0,
    stealthDisadvantage = !!equippedArmor?.stealthDisadvantage,
    baseSpeedMeters =
      (ancestry?.speed ?? 0) +
      (isArtificerSubclass(draft, 'armorer') &&
      (draft.classFeatureChoices?.['armorer-armor-model'] ?? []).includes('infiltrator')
        ? 1.5
        : 0);
  const featureChoices = activeClassFeatureChoices(
      klass,
      draft.level,
      draft.subclassId,
      draft.classFeatureChoices,
    ),
    selectedFeatureSkillIds = featureChoices.flatMap((choice) => {
      if (choice.effect !== 'skill-proficiency' && choice.effect !== 'skill-proficiency-expertise')
        return [];
      const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
      return choice.options
        .filter((option) => option.kind !== 'tool' && selected.has(option.id))
        .map((option) => option.id);
    }),
    selectedFeatureWeaponIds = featureChoices.flatMap((choice) => {
      if (choice.effect !== 'weapon-proficiency') return [];
      const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
      return choice.options.filter((option) => selected.has(option.id)).map((option) => option.id);
    }),
    fixedSubclassSkillIds =
      draft.level < (klass?.subclassLevel ?? 21)
        ? []
        : draft.classId === 'rogue' && draft.subclassId === 'Esploratore'
          ? ['nature', 'survival']
          : draft.classId === 'wizard' && draft.subclassId === 'Canto della Lama'
            ? ['performance']
            : draft.classId === 'monk' && draft.subclassId === 'Via del Maestro Ubriaco'
              ? ['performance']
              : draft.classId === 'monk' && draft.subclassId === 'Via della Misericordia'
                ? ['insight', 'medicine']
                : draft.classId === 'fighter' && draft.subclassId === 'Araldo' && draft.level >= 7
                  ? ['persuasion']
                  : [],
    pickedSkillIds = [
      ...(draft.classSkillProficiencies ?? []),
      ...(draft.ancestrySkillProficiencies ?? []),
      ...(ancestry?.skillProficiencies ?? []),
      ...(backgroundMode === 'homebrew' ? (draft.homebrewBackgroundSkills ?? []) : []),
      ...selectedFeatureSkillIds,
      ...featEffects.skillProficiencyIds,
      ...fixedSubclassSkillIds,
    ],
    expertiseIds = new Set([
      ...featureChoices.flatMap((choice) => {
        if (choice.effect !== 'skill-expertise' && choice.effect !== 'skill-proficiency-expertise')
          return [];
        const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
        return choice.options
          .filter((option) => option.kind !== 'tool' && selected.has(option.id))
          .map((option) => option.id);
      }),
      ...(draft.classId === 'rogue' && draft.level >= 3 && draft.subclassId === 'Esploratore'
        ? ['nature', 'survival']
        : []),
      ...(draft.classId === 'fighter' && draft.level >= 7 && draft.subclassId === 'Araldo'
        ? ['persuasion']
        : []),
      ...featEffects.expertiseIds,
    ]),
    proficientNames = new Set([
      ...(background?.skills ?? []),
      ...SKILLS.filter((skill) => pickedSkillIds.includes(skill.id)).map((skill) => skill.name),
    ]),
    skills = SKILLS.map((skill) => ({
      ...skill,
      proficient: proficientNames.has(skill.name),
      expertise: expertiseIds.has(skill.id),
      disadvantage: skill.id === 'stealth' && stealthDisadvantage,
      value:
        modifiers[skill.ability] +
        (proficientNames.has(skill.name) ? pb * (expertiseIds.has(skill.id) ? 2 : 1) : 0),
    })),
    perception = skills.find((skill) => skill.id === 'perception')!,
    investigation = skills.find((skill) => skill.id === 'investigation')!,
    savingThrows = ABILITIES.map((ability) => ({
      ability: ability.key,
      name: ability.label,
      proficient:
        (klass?.saves.includes(ability.key) ?? false) ||
        featEffects.savingThrowProficiencies.has(ability.key),
      value:
        modifiers[ability.key] +
        ((klass?.saves.includes(ability.key) ?? false) ||
        featEffects.savingThrowProficiencies.has(ability.key)
          ? pb
          : 0) +
        savingThrowBonus,
    }));
  const languages = [
      ...(ancestry?.languages ?? []),
      ...(background?.languages ?? []),
      ...(draft.customLanguages ?? []),
      ...(backgroundMode === 'homebrew' ? (draft.homebrewBackgroundLanguages ?? []) : []),
      ...featEffects.languageProficiencies,
    ].filter((value, index, all) => value && all.indexOf(value) === index),
    classTools = classToolProficiencies(draft, klass),
    tools = [
      ...(ancestry?.tools ?? []),
      ...(draft.ancestryToolProficiencies ?? []),
      ...(background?.tools ?? []),
      ...classTools,
      ...featEffects.toolProficiencies,
      ...(backgroundMode === 'catalog'
        ? (draft.customTools ?? [])
        : (draft.homebrewBackgroundTools ?? [])),
    ].filter((value, index, all) => value && all.indexOf(value) === index);
  return {
    finalAbilities,
    modifiers,
    sanityScore: draft.sanityEnabled ? homebrewAbilityScore(draft.sanityScore) : undefined,
    sanityModifier: draft.sanityEnabled
      ? modifier(homebrewAbilityScore(draft.sanityScore))
      : undefined,
    proficiency: pb,
    armorClass:
      armorBase +
      armorDex +
      unarmoredDefenseModifier +
      shieldBonus +
      armorMagicBonus +
      shieldMagicBonus +
      armorClassBonus,
    initiative: modifiers.dex + featEffects.initiativeBonus + initiativeBonus,
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
    speedMeters: Math.max(
      0,
      baseSpeedMeters - encumbranceSpeedPenaltyMeters - armorStrengthSpeedPenaltyMeters,
    ),
    baseSpeedMeters,
    encumbranceSpeedPenaltyMeters,
    armorStrengthSpeedPenaltyMeters,
    stealthDisadvantage,
    size: ancestry?.size ?? 'Media',
    hitDie: klass?.hitDie ?? 0,
    hitDiceRemaining: Math.max(0, draft.level - (draft.hitDiceSpent ?? 0)),
    carryingCapacityKg,
    moveCapacityKg,
    inventoryWeightKg,
    encumberedThresholdKg,
    heavilyEncumberedThresholdKg,
    encumbrance,
    armorProficient,
    skills,
    languages,
    tools,
    armorProficiencies: [
      ...new Set([
        ...(klass?.armorProficiencies ?? []),
        ...(ancestry?.armorProficiencies ?? []),
        ...subclassArmorProficiencies,
        ...featEffects.armorProficiencies,
      ]),
    ],
    weaponProficiencies: [
      ...new Set([
        ...(klass?.weaponProficiencies ?? []),
        ...(ancestry?.weaponProficiencies ?? []),
        ...subclassWeaponProficiencies,
        ...selectedFeatureWeaponIds,
        ...featEffects.weaponProficiencyIds,
      ]),
    ],
    resistances: [
      ...(ancestry?.resistances ?? []),
      ...equipmentEffects
        .filter((effect) => effect.type === 'resistance' && effect.target)
        .map((effect) => effect.target!),
    ].filter((value, index, all) => all.indexOf(value) === index),
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
      : (subclassCaster?.leveledSpells ?? 0),
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
