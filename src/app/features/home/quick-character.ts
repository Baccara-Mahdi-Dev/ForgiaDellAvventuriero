import { createFreshCharacter } from '../../character/domain/character-draft';
import { CatalogData } from '../../domain/catalog';
import {
  activeClassFeatureChoices,
  classFeatureChoiceCount,
  normalizeClassProgression,
} from '../../domain/class-progression';
import {
  AbilityKey,
  AbilityScores,
  Ancestry,
  CharacterClass,
  CharacterDraft,
  InventoryEntry,
  SKILLS,
} from '../../domain/models';
import { derive, spellSelectionLimits } from '../../domain/rules';
import { AbilityMethod } from '../../models/enum/ability-method';

export interface QuickCharacterSelection {
  name: string;
  profileId: QuickClassProfileId;
  ancestryId: string;
  subclassId: string;
}

export interface QuickCharacterDialogData {
  classes: readonly CharacterClass[];
  ancestries: readonly Ancestry[];
}

export type QuickClassProfileId =
  | 'artificer'
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter-str'
  | 'fighter-dex'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard';

interface LoadoutEntry {
  id: string;
  quantity?: number;
  mandatory?: boolean;
}

interface QuickClassProfile {
  id: QuickClassProfileId;
  classId: string;
  variant?: string;
  abilities: AbilityScores;
  backgroundId: string;
  armorId?: string;
  weaponId: string;
  shield?: boolean;
  loadout: readonly LoadoutEntry[];
  spellIds?: readonly string[];
}

export const QUICK_CLASS_PROFILES: readonly QuickClassProfile[] = [
  {
    id: 'artificer',
    classId: 'artificer',
    abilities: { str: 8, dex: 12, con: 14, int: 15, wis: 10, cha: 13 },
    backgroundId: 'guild-artisan',
    armorId: 'studded-leather',
    weaponId: 'light-crossbow',
    loadout: [
      { id: 'studded-leather', mandatory: true },
      { id: 'light-crossbow', mandatory: true },
      { id: 'bolts-20' },
      { id: 'thieves-tools' },
      { id: 'backpack' },
    ],
    spellIds: ['fire-bolt', 'guidance', 'cure-wounds', 'faerie-fire', 'absorb-elements'],
  },
  {
    id: 'barbarian',
    classId: 'barbarian',
    abilities: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    backgroundId: 'outlander',
    armorId: 'leather',
    weaponId: 'greataxe',
    loadout: [
      { id: 'leather', mandatory: true },
      { id: 'greataxe', mandatory: true },
      { id: 'handaxe', quantity: 2 },
      { id: 'javelin', quantity: 4 },
      { id: 'backpack' },
    ],
  },
  {
    id: 'bard',
    classId: 'bard',
    abilities: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
    backgroundId: 'entertainer',
    armorId: 'leather',
    weaponId: 'rapier',
    loadout: [
      { id: 'leather', mandatory: true },
      { id: 'rapier', mandatory: true },
      { id: 'dagger' },
      { id: 'lute' },
      { id: 'backpack' },
    ],
    spellIds: [
      'vicious-mockery',
      'mage-hand',
      'healing-word',
      'dissonant-whispers',
      'faerie-fire',
      'hideous-laughter',
    ],
  },
  {
    id: 'cleric',
    classId: 'cleric',
    abilities: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 },
    backgroundId: 'acolyte',
    armorId: 'scale-mail',
    weaponId: 'mace',
    shield: true,
    loadout: [
      { id: 'scale-mail', mandatory: true },
      { id: 'mace', mandatory: true },
      { id: 'shield', mandatory: true },
      { id: 'holy-emblem' },
      { id: 'backpack' },
    ],
    spellIds: ['guidance', 'sacred-flame', 'bless', 'healing-word', 'guiding-bolt', 'sanctuary'],
  },
  {
    id: 'druid',
    classId: 'druid',
    abilities: { str: 8, dex: 14, con: 13, int: 10, wis: 15, cha: 12 },
    backgroundId: 'hermit',
    armorId: 'leather',
    weaponId: 'scimitar',
    shield: true,
    loadout: [
      { id: 'leather', mandatory: true },
      { id: 'scimitar', mandatory: true },
      { id: 'shield', mandatory: true },
      { id: 'druidic-mistletoe' },
      { id: 'backpack' },
    ],
    spellIds: ['produce-flame', 'guidance', 'healing-word', 'entangle', 'faerie-fire', 'goodberry'],
  },
  {
    id: 'fighter-str',
    classId: 'fighter',
    variant: 'FOR',
    abilities: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    backgroundId: 'soldier',
    armorId: 'chain-mail',
    weaponId: 'longsword',
    shield: true,
    loadout: [
      { id: 'chain-mail', mandatory: true },
      { id: 'longsword', mandatory: true },
      { id: 'shield', mandatory: true },
      { id: 'handaxe', quantity: 2 },
      { id: 'backpack' },
    ],
  },
  {
    id: 'fighter-dex',
    classId: 'fighter',
    variant: 'DES',
    abilities: { str: 10, dex: 15, con: 14, int: 8, wis: 12, cha: 13 },
    backgroundId: 'soldier',
    armorId: 'leather',
    weaponId: 'rapier',
    loadout: [
      { id: 'leather', mandatory: true },
      { id: 'rapier', mandatory: true },
      { id: 'longbow' },
      { id: 'arrows-20' },
      { id: 'backpack' },
    ],
  },
  {
    id: 'monk',
    classId: 'monk',
    abilities: { str: 10, dex: 15, con: 13, int: 8, wis: 14, cha: 12 },
    backgroundId: 'hermit',
    weaponId: 'quarterstaff',
    loadout: [
      { id: 'quarterstaff', mandatory: true },
      { id: 'dart', quantity: 10 },
      { id: 'backpack' },
    ],
  },
  {
    id: 'paladin',
    classId: 'paladin',
    abilities: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
    backgroundId: 'noble',
    armorId: 'chain-mail',
    weaponId: 'longsword',
    shield: true,
    loadout: [
      { id: 'chain-mail', mandatory: true },
      { id: 'longsword', mandatory: true },
      { id: 'shield', mandatory: true },
      { id: 'holy-emblem' },
      { id: 'backpack' },
    ],
  },
  {
    id: 'ranger',
    classId: 'ranger',
    abilities: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 },
    backgroundId: 'outlander',
    armorId: 'leather',
    weaponId: 'longbow',
    loadout: [
      { id: 'leather', mandatory: true },
      { id: 'longbow', mandatory: true },
      { id: 'arrows-20' },
      { id: 'shortsword', quantity: 2 },
      { id: 'backpack' },
    ],
  },
  {
    id: 'rogue',
    classId: 'rogue',
    abilities: { str: 10, dex: 15, con: 14, int: 12, wis: 8, cha: 13 },
    backgroundId: 'criminal',
    armorId: 'leather',
    weaponId: 'rapier',
    loadout: [
      { id: 'leather', mandatory: true },
      { id: 'rapier', mandatory: true },
      { id: 'shortbow' },
      { id: 'arrows-20' },
      { id: 'dagger', quantity: 2 },
      { id: 'thieves-tools' },
    ],
  },
  {
    id: 'sorcerer',
    classId: 'sorcerer',
    abilities: { str: 8, dex: 13, con: 14, int: 10, wis: 12, cha: 15 },
    backgroundId: 'noble',
    weaponId: 'light-crossbow',
    loadout: [
      { id: 'light-crossbow', mandatory: true },
      { id: 'bolts-20' },
      { id: 'dagger', quantity: 2 },
      { id: 'arcane-crystal' },
    ],
    spellIds: ['fire-bolt', 'mage-hand', 'shield', 'magic-missile', 'chromatic-orb', 'sleep'],
  },
  {
    id: 'warlock',
    classId: 'warlock',
    abilities: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
    backgroundId: 'sage',
    armorId: 'leather',
    weaponId: 'light-crossbow',
    loadout: [
      { id: 'leather', mandatory: true },
      { id: 'light-crossbow', mandatory: true },
      { id: 'bolts-20' },
      { id: 'dagger', quantity: 2 },
      { id: 'arcane-crystal' },
    ],
    spellIds: ['eldritch-blast', 'mage-hand', 'hex', 'armor-of-agathys', 'hellish-rebuke'],
  },
  {
    id: 'wizard',
    classId: 'wizard',
    abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    backgroundId: 'sage',
    weaponId: 'quarterstaff',
    loadout: [
      { id: 'quarterstaff', mandatory: true },
      { id: 'dagger' },
      { id: 'arcane-crystal' },
      { id: 'spellbook' },
    ],
    spellIds: ['fire-bolt', 'mage-hand', 'shield', 'mage-armor', 'find-familiar', 'magic-missile'],
  },
] as const;

const LANGUAGES = ['Elfico', 'Nanico', 'Draconico', 'Gnomesco', 'Goblin', 'Halfling', 'Orchesco'];
const TOOLS = ['Strumenti da fabbro', 'Strumenti da inventore', 'Strumenti da intagliatore'];

export interface QuickClassOption {
  id: QuickClassProfileId;
  classId: string;
  label: string;
}

export function quickClassOptions(classes: readonly CharacterClass[]): QuickClassOption[] {
  const byId = new Map(classes.map((klass) => [klass.id, klass]));
  return QUICK_CLASS_PROFILES.flatMap((profile) => {
    const klass = byId.get(profile.classId);
    return klass
      ? [
          {
            id: profile.id,
            classId: profile.classId,
            label: profile.variant ? `${klass.name} (${profile.variant})` : klass.name,
          },
        ]
      : [];
  });
}

function preferredAbilities(profile: QuickClassProfile): AbilityKey[] {
  return (Object.keys(profile.abilities) as AbilityKey[]).sort(
    (left, right) => profile.abilities[right] - profile.abilities[left],
  );
}

function takeUnique(options: readonly string[], count: number, excluded: Iterable<string> = []) {
  const blocked = new Set(excluded);
  return options.filter((option) => !blocked.has(option)).slice(0, count);
}

function mergeInventory(entries: readonly LoadoutEntry[], validIds: ReadonlySet<string>) {
  const merged = new Map<string, { quantity: number; mandatory: boolean }>();
  for (const entry of entries) {
    if (!validIds.has(entry.id)) continue;
    const current = merged.get(entry.id) ?? { quantity: 0, mandatory: false };
    current.quantity += entry.quantity ?? 1;
    current.mandatory ||= entry.mandatory ?? false;
    merged.set(entry.id, current);
  }
  return merged;
}

function inventoryEntries(items: Map<string, { quantity: number }>): InventoryEntry[] {
  return [...items].map(([equipmentId, item]) => ({ equipmentId, quantity: item.quantity }));
}

function optimizeInventoryForCapacity(
  draft: CharacterDraft,
  profile: QuickClassProfile,
  catalog: CatalogData,
): InventoryEntry[] {
  const items = mergeInventory(profile.loadout, new Set(catalog.equipment.map((item) => item.id)));
  const optionalByWeight = [...items]
    .filter(([, item]) => !item.mandatory)
    .sort((left, right) => {
      const leftWeight = catalog.equipment.find((item) => item.id === left[0])?.weightKg ?? 0;
      const rightWeight = catalog.equipment.find((item) => item.id === right[0])?.weightKg ?? 0;
      return rightWeight - leftWeight;
    });

  for (const [id, item] of optionalByWeight) {
    while (item.quantity > 0) {
      const inventory = inventoryEntries(items);
      const load = derive({ ...draft, inventory }, catalog);
      if (load.inventoryWeightKg <= load.carryingCapacityKg) return inventory;
      item.quantity -= 1;
    }
    if (!item.quantity) items.delete(id);
  }

  return inventoryEntries(items);
}

function defaultClassChoices(
  draft: CharacterDraft,
  klass: CharacterClass,
  proficientSkills: ReadonlySet<string>,
): Record<string, string[]> {
  const selections: Record<string, string[]> = {};
  for (const choice of activeClassFeatureChoices(klass, 1, draft.subclassId, selections)) {
    const count = classFeatureChoiceCount(choice, 1);
    const available = choice.options.filter((option) => {
      if (choice.requiresKnownSpell && !draft.spellIds.includes(option.id)) return false;
      return (
        !choice.requiresProficiency ||
        proficientSkills.has(option.id) ||
        option.id === 'thieves-tools'
      );
    });
    selections[choice.id] = available.slice(0, count).map((option) => option.id);
  }
  return selections;
}

export function buildQuickCharacter(
  selection: QuickCharacterSelection,
  catalog: CatalogData,
): CharacterDraft {
  const profile = QUICK_CLASS_PROFILES.find((candidate) => candidate.id === selection.profileId);
  const klass = catalog.classes.find((candidate) => candidate.id === profile?.classId);
  const ancestry = catalog.ancestries.find((candidate) => candidate.id === selection.ancestryId);
  if (!profile || !klass || !ancestry) throw new Error('Scelta rapida non valida.');

  const background =
    catalog.backgrounds.find((candidate) => candidate.id === profile.backgroundId) ??
    catalog.backgrounds[0];
  const abilityOrder = preferredAbilities(profile);
  const ancestryBonusAbilities = takeUnique(
    abilityOrder.filter((ability) =>
      (ancestry.flexibleBonusOptions ?? abilityOrder).includes(ability),
    ),
    ancestry.flexibleBonusCount ?? 0,
  ) as AbilityKey[];
  const backgroundSkillIds = new Set(
    (background?.skills ?? []).flatMap((name) => {
      const skill = SKILLS.find((candidate) => candidate.name === name);
      return skill ? [skill.id] : [];
    }),
  );
  const ancestrySkillProficiencies = takeUnique(
    ancestry.skillChoiceOptions ?? [],
    ancestry.skillChoices ?? 0,
    backgroundSkillIds,
  );
  const unavailableSkills = new Set([...backgroundSkillIds, ...ancestrySkillProficiencies]);
  const classSkillProficiencies = takeUnique(
    klass.skillOptions,
    klass.skillChoices,
    unavailableSkills,
  );
  const proficientSkills = new Set([
    ...backgroundSkillIds,
    ...ancestrySkillProficiencies,
    ...classSkillProficiencies,
  ]);
  const weapon = catalog.equipment.find((item) => item.id === profile.weaponId);
  const focusIds = profile.loadout
    .map((item) => item.id)
    .filter((id) => /^(arcane-|druidic-|holy-)/.test(id));

  let draft: CharacterDraft = {
    ...createFreshCharacter(catalog.manifest.dataVersion),
    revision: 1,
    name: selection.name.trim(),
    alignment: 'true-neutral',
    abilityMethod: AbilityMethod.STANDARD,
    abilities: { ...profile.abilities },
    ancestryId: ancestry.id,
    ancestryBonusAbilities,
    ancestrySkillProficiencies,
    ancestryToolProficiencies: takeUnique(ancestry.toolOptions ?? [], ancestry.toolChoices ?? 0),
    classId: klass.id,
    subclassId: klass.subclassLevel === 1 ? selection.subclassId : '',
    classSkillProficiencies,
    backgroundId: background?.id ?? '',
    level: 1,
    spellIds: [],
    equippedArmorId: profile.armorId ?? '',
    shieldEquipped: !!profile.shield,
    equippedShieldId: profile.shield ? 'shield' : '',
    equippedWeapons: weapon
      ? [
          {
            equipmentId: weapon.id,
            hands: weapon.properties?.includes('a due mani') ? 2 : 1,
          },
        ]
      : [],
    equippedItemIds: focusIds,
    customLanguages: takeUnique(
      LANGUAGES,
      (ancestry.languageChoices ?? 0) + (background?.languageChoices ?? 0),
      ancestry.languages,
    ),
    customTools: takeUnique(TOOLS, background?.toolChoices ?? 0, background?.tools ?? []),
    notes: 'Personaggio di livello 1 creato con la procedura rapida.',
  };

  const spellcastingModifier = derive(draft, catalog).modifiers[klass.primary];
  const spellLimits = spellSelectionLimits(klass.id, 1, spellcastingModifier, draft.subclassId);
  const recommendedSpells = (profile.spellIds ?? []).flatMap((id) => {
    const spell = catalog.spells.find((candidate) => candidate.id === id);
    return spell ? [spell] : [];
  });
  draft.spellIds = [
    ...recommendedSpells.filter((spell) => spell.level === 0).slice(0, spellLimits.cantrips),
    ...recommendedSpells.filter((spell) => spell.level === 1).slice(0, spellLimits.leveledSpells),
  ].map((spell) => spell.id);
  draft = { ...draft, ...normalizeClassProgression(draft, klass) };
  draft.classFeatureChoices = defaultClassChoices(draft, klass, proficientSkills);
  draft.inventory = optimizeInventoryForCapacity(draft, profile, catalog);
  return draft;
}
