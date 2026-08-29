import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import type { WizardComponent } from '../wizard.component';

@Component({
  selector: 'app-summary-step',
  imports: [FormsModule, NgIcon],
  templateUrl: './summary-step.component.html',
  styleUrl: './summary-step.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryStepComponent {
  readonly wizard = input.required<WizardComponent>();
}
