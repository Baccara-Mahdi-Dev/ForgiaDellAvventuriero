import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  constructor(readonly theme: ThemeService) {}
}
