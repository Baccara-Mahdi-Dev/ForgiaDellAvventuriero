import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  activeClassFeatureChoices,
  classFeatureChoiceCount,
  subclassAvailableAtLevel,
} from '../../domain/class-progression';
import { CharacterClass, ClassFeatureChoice, StepId } from '../../domain/models';

@Component({
  selector: 'app-class-progression',
  imports: [FormsModule],
  templateUrl: './class-progression.component.html',
  styleUrl: './class-progression.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassProgressionComponent {
  readonly klass = input.required<CharacterClass>();
  readonly level = input.required<number>();
  readonly subclassId = input.required<string>();
  readonly selections = input.required<Record<string, string[]>>();
  readonly wizardStep = input.required<StepId>();

  readonly subclassChange = output<string>();
  readonly selectionsChange = output<Record<string, string[]>>();

  readonly subclassUnlocked = computed(() => subclassAvailableAtLevel(this.klass(), this.level()));
  readonly activeChoices = computed(() =>
    activeClassFeatureChoices(this.klass(), this.level(), this.subclassId()),
  );

  choiceCount(choice: ClassFeatureChoice): number {
    return classFeatureChoiceCount(choice, this.level());
  }

  selected(choiceId: string): string[] {
    return this.selections()[choiceId] ?? [];
  }

  isSubclassChoice(choiceId: string): boolean {
    return (this.klass().subclassFeatures ?? []).some(
      (featureSet) =>
        featureSet.subclassId === this.subclassId() &&
        featureSet.choices.some((choice) => choice.id === choiceId),
    );
  }

  toggle(choice: ClassFeatureChoice, optionId: string): void {
    const limit = this.choiceCount(choice);
    const current = this.selected(choice.id);
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : current.length < limit
        ? [...current, optionId]
        : current;
    this.selectionsChange.emit({ ...this.selections(), [choice.id]: next });
  }
}
