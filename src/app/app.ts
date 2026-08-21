import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { gameAnvil } from '@ng-icons/game-icons';
import { simpleGithub } from '@ng-icons/simple-icons';
import { TuiRoot } from '@taiga-ui/core';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, NgIcon],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly githubIcon = simpleGithub;
  readonly authorIcon = gameAnvil;
}
