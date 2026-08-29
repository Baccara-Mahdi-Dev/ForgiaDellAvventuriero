import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import type { WizardComponent } from '../wizard.component';
import { HomebrewEquipmentDialogComponent } from '../homebrew-equipment-dialog.component';
import { MagicWeaponBaseDialogComponent } from '../magic-weapon-base-dialog.component';

@Component({
  selector: 'app-equipment-step',
  imports: [FormsModule, NgIcon, HomebrewEquipmentDialogComponent, MagicWeaponBaseDialogComponent],
  templateUrl: './equipment-step.component.html',
  styleUrl: './equipment-step.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentStepComponent {
  readonly wizard = input.required<WizardComponent>();
}
