import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { WizardComponent } from '../wizard.component';

@Component({
  selector: 'app-spells-step',
  imports: [FormsModule],
  templateUrl: './spells-step.component.html',
  styleUrl: './spells-step.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellsStepComponent {
  readonly wizard = input.required<WizardComponent>();
}
