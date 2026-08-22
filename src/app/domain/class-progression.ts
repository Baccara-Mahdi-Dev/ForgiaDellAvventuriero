import { CharacterClass, CharacterDraft, ClassFeatureChoice } from './models';

export function subclassAvailableAtLevel(
  klass: CharacterClass | undefined,
  level: number,
): boolean {
  return !!klass && level >= klass.subclassLevel;
}

export function classFeatureChoicesFor(
  klass: CharacterClass | undefined,
  subclassId: string,
): ClassFeatureChoice[] {
  if (!klass) return [];
  const subclassChoices = (klass.subclassFeatures ?? [])
    .filter((featureSet) => featureSet.subclassId === subclassId)
    .flatMap((featureSet) => featureSet.choices);
  return [...(klass.featureChoices ?? []), ...subclassChoices];
}

export function activeClassFeatureChoices(
  klass: CharacterClass | undefined,
  level: number,
  subclassId: string,
): ClassFeatureChoice[] {
  return classFeatureChoicesFor(klass, subclassId).filter((choice) => choice.minLevel <= level);
}

export function classFeatureChoiceCount(choice: ClassFeatureChoice, level: number): number {
  return (
    [...choice.countByLevel].sort((a, b) => b.level - a.level).find((entry) => entry.level <= level)
      ?.count ?? 0
  );
}

export function normalizeClassProgression(
  draft: Pick<CharacterDraft, 'level' | 'subclassId' | 'classFeatureChoices'>,
  klass: CharacterClass | undefined,
): Pick<CharacterDraft, 'subclassId' | 'classFeatureChoices'> {
  const subclassId =
    subclassAvailableAtLevel(klass, draft.level) && klass?.subclasses.includes(draft.subclassId)
      ? draft.subclassId
      : '';
  const choices = activeClassFeatureChoices(klass, draft.level, subclassId);
  const classFeatureChoices = Object.fromEntries(
    choices.map((choice) => {
      const validOptions = new Set(choice.options.map((option) => option.id));
      const selected = [...new Set(draft.classFeatureChoices?.[choice.id] ?? [])]
        .filter((optionId) => validOptions.has(optionId))
        .slice(0, classFeatureChoiceCount(choice, draft.level));
      return [choice.id, selected];
    }),
  );
  return { subclassId, classFeatureChoices };
}
