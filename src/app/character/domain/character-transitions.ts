import { attunementLimit } from '../../domain/artificer-rules';
import { normalizeClassProgression } from '../../domain/class-progression';
import { CharacterClass, CharacterDraft } from '../../domain/models';

export function changeAncestry(draft: CharacterDraft, ancestryId: string): Partial<CharacterDraft> {
  const changed = draft.ancestryId !== ancestryId;
  return {
    ancestryId,
    ancestryBonusAbilities: changed ? [] : draft.ancestryBonusAbilities,
    ancestrySkillProficiencies: changed ? [] : draft.ancestrySkillProficiencies,
    ancestryToolProficiencies: changed ? [] : draft.ancestryToolProficiencies,
    featIds: changed ? [] : draft.featIds,
    featAbilityChoices: changed ? {} : draft.featAbilityChoices,
    customLanguages: changed ? [] : draft.customLanguages,
    customTools: changed ? [] : draft.customTools,
  };
}

export function changeClass(draft: CharacterDraft, classId: string): Partial<CharacterDraft> {
  const unchanged = draft.classId === classId;
  return {
    classId,
    subclassId: unchanged ? draft.subclassId : '',
    classSkillProficiencies: unchanged ? draft.classSkillProficiencies : [],
    classFeatureChoices: unchanged ? draft.classFeatureChoices : {},
    hpRolls: unchanged ? draft.hpRolls : [],
    manualHp: unchanged ? draft.manualHp : undefined,
    asi: unchanged ? draft.asi : {},
    featIds: unchanged ? draft.featIds : [],
    featAbilityChoices: unchanged ? draft.featAbilityChoices : {},
    spellIds: [],
    customTools: unchanged ? draft.customTools : [],
    equippedArmorId: unchanged ? draft.equippedArmorId : '',
    shieldEquipped: unchanged ? draft.shieldEquipped : false,
    attunedEquipmentIds: (draft.attunedEquipmentIds ?? []).slice(
      0,
      attunementLimit({ classId, level: draft.level }),
    ),
  };
}

export function changeLevel(
  draft: CharacterDraft,
  klass: CharacterClass | undefined,
  level: number,
  random: () => number = Math.random,
): Partial<CharacterDraft> {
  const needed = Math.max(0, level - 1);
  const die = klass?.hitDie ?? 1;
  const hpRolls = (draft.hpRolls ?? []).slice(0, needed);
  if (draft.hpMethod === 'roll')
    while (hpRolls.length < needed) hpRolls.push(Math.floor(random() * die) + 1);
  const progression = normalizeClassProgression({ ...draft, level }, klass);
  return {
    level,
    hpRolls,
    attunedEquipmentIds: (draft.attunedEquipmentIds ?? []).slice(
      0,
      attunementLimit({ classId: draft.classId, level }),
    ),
    ...progression,
  };
}
