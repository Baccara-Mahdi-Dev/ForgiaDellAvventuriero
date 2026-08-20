import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterDraft } from '../../domain/models';
import { WizardStore } from '../../state/wizard.store';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
@Component({
  selector: 'app-home',
  imports: [DatePipe, ThemeToggleComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  readonly characters = signal<CharacterDraft[]>([]);
  constructor(
    readonly store: WizardStore,
    private router: Router,
  ) {}
  async ngOnInit() {
    this.characters.set((await this.store.list()).filter((x) => x.name || x.revision > 0));
  }
  create() {
    const d = this.store.newDraft();
    void this.router.navigate(['/crea', d.id, 'caratteristiche']);
  }
  open(d: CharacterDraft) {
    void this.router.navigate(['/crea', d.id, 'caratteristiche']);
  }
  async remove(d: CharacterDraft, event: Event) {
    event.stopPropagation();
    if (confirm(`Eliminare ${d.name || 'questa bozza'}?`)) {
      await this.store.remove(d.id);
      this.characters.update((a) => a.filter((x) => x.id !== d.id));
    }
  }
  async import(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      await this.store.importJson(file);
      void this.router.navigate(['/crea', this.store.draft().id, 'riepilogo']);
    } catch {
      alert('Il file non è un personaggio valido.');
    }
  }
}
