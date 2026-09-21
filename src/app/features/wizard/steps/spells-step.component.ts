import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { iconoirEye, iconoirPlus, iconoirMinus, iconoirXmark } from '@ng-icons/iconoir';
import { asSpell } from '../../../domain/homebrew-spell';
import type { Spell } from '../../../domain/models';
import type { WizardComponent } from '../wizard.component';

@Component({
  selector: 'app-spells-step',
  imports: [FormsModule, NgIcon],
  providers: [provideIcons({ iconoirEye, iconoirPlus, iconoirMinus, iconoirXmark })],
  templateUrl: './spells-step.component.html',
  styleUrl: './spells-step.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellsStepComponent {
  readonly wizard = input.required<WizardComponent>();
  readonly openedSpell = signal<Spell | null>(null);
  readonly canSelectOpenedSpell = signal(false);
  readonly spellDialog = viewChild.required<ElementRef<HTMLDialogElement>>('spellDialog');
  readonly asSpell = asSpell;

  isSelected(spell: Spell): boolean {
    return this.wizard().store.draft().spellIds.includes(spell.id);
  }

  openSpell(spell: Spell, selectable = true): void {
    this.canSelectOpenedSpell.set(selectable);
    this.openedSpell.set(spell);
    this.spellDialog().nativeElement.showModal();
  }

  closeSpell(): void {
    this.spellDialog().nativeElement.close();
    this.openedSpell.set(null);
  }
}
