import { RulesCatalog } from '../../domain/catalog';
import {
  Ancestry,
  BackgroundSelectionMode,
  CharacterClass,
  CharacterDraft,
  StepId,
} from '../../domain/models';
import { growthChoicesComplete } from '../../domain/rules';
import { AbilityMethod } from '../../models/enum/ability-method';

export interface CharacterProgressContext {
  draft: CharacterDraft;
  catalog: RulesCatalog;
  pointsSpent: number;
  ancestry?: Ancestry;
  klass?: CharacterClass;
  backgroundMode: BackgroundSelectionMode;
  homebrewBackgroundSecondaryCount: number;
  languageChoiceLimit: number;
  toolChoiceLimit: number;
  backgroundHasClassSkill: boolean;
  classFeaturesComplete: boolean;
}

export function isCharacterStepComplete(step: StepId, context: CharacterProgressContext): boolean {
  const d = context.draft;
  switch (step) {
    case 'caratteristiche':
      return d.abilityMethod !== AbilityMethod.POINT || context.pointsSpent === 27;
    case 'razza':
      return (
        !!d.ancestryId &&
        (d.ancestryBonusAbilities?.length ?? 0) === (context.ancestry?.flexibleBonusCount ?? 0) &&
        (d.ancestrySkillProficiencies?.length ?? 0) === (context.ancestry?.skillChoices ?? 0) &&
        (d.ancestryToolProficiencies?.length ?? 0) === (context.ancestry?.toolChoices ?? 0)
      );
    case 'classe':
      return (
        !!d.classId &&
        (d.classSkillProficiencies?.length ?? 0) === (context.klass?.skillChoices ?? 0)
      );
    case 'background':
      return (
        (context.backgroundMode === 'catalog'
          ? !!d.backgroundId
          : !!d.homebrewBackgroundName?.trim() &&
            (d.homebrewBackgroundSkills?.length ?? 0) === 2 &&
            context.homebrewBackgroundSecondaryCount === 2) &&
        !!d.alignment &&
        (d.customLanguages?.length ?? 0) === context.languageChoiceLimit &&
        (d.customTools?.length ?? 0) === context.toolChoiceLimit &&
        !context.backgroundHasClassSkill
      );
    case 'livello':
      return (
        (d.hpMethod !== 'manual' || (d.manualHp ?? 0) > 0) &&
        (d.level < (context.klass?.subclassLevel ?? 21) || !!d.subclassId) &&
        context.classFeaturesComplete
      );
    case 'talenti':
      return growthChoicesComplete(d, context.catalog);
    case 'riepilogo':
      return !!d.name.trim();
    default:
      return true;
  }
}
