import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  QuickCharacterDialogData,
  QuickCharacterSelection,
  QuickClassProfileId,
  quickClassOptions,
} from './quick-character';

@Component({
  selector: 'app-quick-character-dialog',
  imports: [FormsModule, TuiAutoFocus, TuiButton],
  templateUrl: './quick-character-dialog.component.html',
  styleUrl: './quick-character-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickCharacterDialogComponent {
  readonly context =
    injectContext<TuiDialogContext<QuickCharacterSelection, QuickCharacterDialogData>>();
  readonly name = signal('');
  readonly profileId = signal<QuickClassProfileId | ''>('');
  readonly ancestryId = signal('');
  readonly subclassId = signal('');
  readonly classOptions = quickClassOptions(this.context.data.classes);
  readonly selectedOption = computed(() =>
    this.classOptions.find((option) => option.id === this.profileId()),
  );
  readonly selectedClass = computed(() =>
    this.context.data.classes.find((klass) => klass.id === this.selectedOption()?.classId),
  );
  readonly needsSubclass = computed(() => this.selectedClass()?.subclassLevel === 1);
  readonly canSubmit = computed(
    () =>
      !!this.name().trim() &&
      !!this.profileId() &&
      !!this.ancestryId() &&
      (!this.needsSubclass() || !!this.subclassId()),
  );

  selectClass(profileId: QuickClassProfileId | ''): void {
    this.profileId.set(profileId);
    this.ancestryId.set('');
    this.subclassId.set('');
  }

  submit(): void {
    if (!this.canSubmit() || !this.profileId()) return;
    this.context.completeWith({
      name: this.name().trim(),
      profileId: this.profileId() as QuickClassProfileId,
      ancestryId: this.ancestryId(),
      subclassId: this.subclassId(),
    });
  }
}
