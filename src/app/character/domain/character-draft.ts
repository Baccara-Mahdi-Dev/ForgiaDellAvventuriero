import {
  CharacterClass,
  CharacterDraft,
  HOMEBREW_ABILITY_MAX,
  HOMEBREW_ABILITY_MIN,
} from '../../domain/models';
import { normalizeClassProgression } from '../../domain/class-progression';
import { attunementLimit } from '../../domain/artificer-rules';
import { normalizeHomebrewEquipment } from '../../domain/homebrew-equipment';
import { AbilityMethod } from '../../models/enum/ability-method';

export interface CharacterNormalizationContext {
  catalogVersion: string;
  classes: readonly CharacterClass[];
}

export function createFreshCharacter(
  catalogVersion: string,
  id: string = crypto.randomUUID(),
  updatedAt: string = new Date().toISOString(),
): CharacterDraft {
  return {
    schemaVersion: 1,
    catalogVersion,
    id,
    revision: 0,
    updatedAt,
    name: '',
    alignment: '',
    abilityMethod: AbilityMethod.POINT,
    abilities: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    sanityEnabled: false,
    sanityScore: 8,
    ancestryId: '',
    ancestryBonusAbilities: [],
    ancestrySkillProficiencies: [],
    ancestryToolProficiencies: [],
    classId: '',
    subclassId: '',
    classSkillProficiencies: [],
    classFeatureChoices: {},
    backgroundId: '',
    backgroundSelectionMode: 'catalog',
    homebrewBackgroundName: '',
    homebrewBackgroundDescription: '',
    homebrewBackgroundSkills: [],
    homebrewBackgroundLanguages: [],
    homebrewBackgroundTools: [],
    customLanguages: [],
    customTools: [],
    level: 1,
    hpMethod: 'average',
    hpRolls: [],
    asi: {},
    featIds: [],
    featAbilityChoices: {},
    featProficiencyChoices: {},
    spellIds: [],
    homebrewSpells: [],
    homebrewEquipment: [],
    grantedSpellChoices: {},
    spellGrantTraditions: {},
    equippedArmorId: '',
    shieldEquipped: false,
    equippedShieldId: '',
    equippedWeapons: [],
    equippedItemIds: [],
    attunedEquipmentIds: [],
    equipmentCharges: {},
    inventory: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    hitDiceSpent: 0,
    inspiration: false,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    notes: '',
  };
}

export function normalizeCharacterDraft(
  value: CharacterDraft,
  context: CharacterNormalizationContext,
): CharacterDraft {
  const normalized: CharacterDraft = {
    ...value,
    catalogVersion: context.catalogVersion,
    alignment: value.alignment ?? '',
    sanityEnabled: value.sanityEnabled ?? false,
    sanityScore: Math.max(
      HOMEBREW_ABILITY_MIN,
      Math.min(HOMEBREW_ABILITY_MAX, Math.floor(value.sanityScore ?? 8)),
    ),
    ancestryBonusAbilities: value.ancestryBonusAbilities ?? [],
    ancestrySkillProficiencies: value.ancestrySkillProficiencies ?? [],
    ancestryToolProficiencies: value.ancestryToolProficiencies ?? [],
    classSkillProficiencies: value.classSkillProficiencies ?? [],
    classFeatureChoices: value.classFeatureChoices ?? {},
    customLanguages: value.customLanguages ?? [],
    customTools: value.customTools ?? [],
    backgroundSelectionMode: value.backgroundSelectionMode ?? 'catalog',
    homebrewBackgroundName: value.homebrewBackgroundName ?? '',
    homebrewBackgroundDescription: value.homebrewBackgroundDescription ?? '',
    homebrewBackgroundSkills: value.homebrewBackgroundSkills ?? [],
    homebrewBackgroundLanguages: value.homebrewBackgroundLanguages ?? [],
    homebrewBackgroundTools: value.homebrewBackgroundTools ?? [],
    hpMethod: value.hpMethod ?? 'average',
    hpRolls: value.hpRolls ?? [],
    featAbilityChoices: value.featAbilityChoices ?? {},
    featProficiencyChoices: value.featProficiencyChoices ?? {},
    grantedSpellChoices: value.grantedSpellChoices ?? {},
    spellGrantTraditions: value.spellGrantTraditions ?? {},
    homebrewSpells: (value.homebrewSpells ?? [])
      .filter(
        (spell) => spell && !!spell.id && !!spell.name && spell.level >= 0 && spell.level <= 9,
      )
      .map((spell) => ({ ...spell, concentration: spell.concentration ?? false })),
    homebrewEquipment: (value.homebrewEquipment ?? [])
      .filter((item) => item && !!item.id && !!item.name && !!item.kind)
      .map(normalizeHomebrewEquipment),
    equippedArmorId: value.equippedArmorId ?? '',
    shieldEquipped: value.shieldEquipped ?? false,
    equippedShieldId: value.equippedShieldId ?? (value.shieldEquipped ? 'shield' : ''),
    equippedWeapons: (value.equippedWeapons ?? []).filter(
      (weapon) => weapon && (weapon.hands === 1 || weapon.hands === 2) && !!weapon.equipmentId,
    ),
    equippedItemIds: value.equippedItemIds ?? [],
    attunedEquipmentIds: (value.attunedEquipmentIds ?? []).slice(0, attunementLimit(value)),
    equipmentCharges: value.equipmentCharges ?? {},
    inventory: value.inventory ?? [],
    coins: value.coins ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    hitDiceSpent: value.hitDiceSpent ?? 0,
    inspiration: value.inspiration ?? false,
    deathSaveSuccesses: value.deathSaveSuccesses ?? 0,
    deathSaveFailures: value.deathSaveFailures ?? 0,
  };
  const klass = context.classes.find((item) => item.id === normalized.classId);
  return { ...normalized, ...normalizeClassProgression(normalized, klass) };
}
