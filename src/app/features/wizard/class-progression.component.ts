import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  activeClassFeatureChoices,
  classFeatureChoiceCount,
  subclassAvailableAtLevel,
} from '../../domain/class-progression';
import {
  ABILITIES,
  CharacterClass,
  ClassFeatureChoice,
  SKILLS,
  SubclassFeatureDetail,
} from '../../domain/models';

@Component({
  selector: 'app-class-progression',
  imports: [],
  templateUrl: './class-progression.component.html',
  styleUrl: './class-progression.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassProgressionComponent {
  readonly klass = input.required<CharacterClass>();
  readonly level = input.required<number>();
  readonly subclassId = input.required<string>();
  readonly selections = input.required<Record<string, string[]>>();
  readonly proficiencyIds = input<string[]>([]);
  readonly knownSpellIds = input<string[]>([]);
  readonly subclassChange = output<string>();
  readonly selectionsChange = output<Record<string, string[]>>();

  readonly subclassUnlocked = computed(() => subclassAvailableAtLevel(this.klass(), this.level()));
  readonly activeChoices = computed(() =>
    activeClassFeatureChoices(this.klass(), this.level(), this.subclassId(), this.selections()),
  );
  readonly subclassProgression = computed(() =>
    (this.klass().subclassProgressions ?? []).find(
      (progression) => progression.subclassId === this.subclassId(),
    ),
  );

  featureAvailable(feature: SubclassFeatureDetail): boolean {
    return feature.level <= this.level();
  }

  choiceCount(choice: ClassFeatureChoice): number {
    return classFeatureChoiceCount(choice, this.level());
  }

  selected(choiceId: string): string[] {
    return this.selections()[choiceId] ?? [];
  }

  selectedCount(choiceId: string, optionId: string): number {
    return this.selected(choiceId).filter((id) => id === optionId).length;
  }

  isSubclassChoice(choiceId: string): boolean {
    return (this.klass().subclassFeatures ?? []).some(
      (featureSet) =>
        featureSet.subclassId === this.subclassId() &&
        featureSet.choices.some((choice) => choice.id === choiceId),
    );
  }

  abilityShort(optionId: string): string {
    const ability = SKILLS.find((skill) => skill.id === optionId)?.ability;
    return ABILITIES.find((item) => item.key === ability)?.short ?? '';
  }

  unavailable(choice: ClassFeatureChoice, optionId: string): boolean {
    const selectedInExclusiveChoice = (choice.exclusiveWithChoices ?? []).some((choiceId) =>
      (this.selections()[choiceId] ?? []).includes(optionId),
    );
    return (
      (!!choice.requiresProficiency && !this.proficiencyIds().includes(optionId)) ||
      (!!choice.requiresKnownSpell && !this.knownSpellIds().includes(optionId)) ||
      selectedInExclusiveChoice
    );
  }

  toggle(choice: ClassFeatureChoice, optionId: string): void {
    if (this.unavailable(choice, optionId)) return;
    const limit = this.choiceCount(choice);
    const current = this.selected(choice.id);
    const next =
      current.includes(optionId) && !choice.repeatable
        ? current.filter((id) => id !== optionId)
        : current.length < limit
          ? [...current, optionId]
          : current;
    this.selectionsChange.emit({ ...this.selections(), [choice.id]: next });
  }

  removeOne(choice: ClassFeatureChoice, optionId: string): void {
    const current = this.selected(choice.id);
    const index = current.lastIndexOf(optionId);
    if (index < 0) return;
    this.selectionsChange.emit({
      ...this.selections(),
      [choice.id]: current.filter((_, candidateIndex) => candidateIndex !== index),
    });
  }
}
