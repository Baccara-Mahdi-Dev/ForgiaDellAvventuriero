import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterDraft } from '../../domain/models';
import { WizardStore } from '../../state/wizard.store';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { NgIcon, provideIcons } from '@ng-icons/core';

import { monoDelete } from '@ng-icons/mono-icons';
@Component({
  selector: 'app-home',
  imports: [DatePipe, ThemeToggleComponent, NgIcon],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ monoDelete })],
})
export class HomeComponent implements OnInit {
  readonly characters = signal<CharacterDraft[]>([]);
  constructor(
    readonly store: WizardStore,
    private router: Router,
    private feedback: UiFeedbackService,
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
    if (await this.feedback.confirmDelete(d.name || 'Senza nome')) {
      if (await this.rmpg(d))
        this.feedback.success('Il personaggio è stato eliminato.', 'Bozza rimossa');
    }
  }
  async import(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      await this.store.importJson(file);
      void this.router.navigate(['/crea', this.store.draft().id, 'riepilogo']);
    } catch {
      this.feedback.error(
        'Il file non è un personaggio valido o compatibile.',
        'Importazione fallita',
      );
    }
  }
  async removeAll(event: Event) {
    event.stopPropagation(); 
    if (await this.feedback.confirmDelete('', 'Vuoi dire addio a tutti i tuoi avventurieri?')) {
      const cs: CharacterDraft[] = this.characters();
      cs.forEach((c: CharacterDraft) => this.rmpg(c));
      this.feedback.success('Tutti gli avventurieri son stati eliminati.');
    }
  }
  private async rmpg(c: CharacterDraft) {
    try {
      await this.store.remove(c.id);
    } catch (error) {
      let eMsg: string = 'Rimozione pg fallita';
      console.log(eMsg, error);
      this.feedback.error(eMsg);
      return false;
    }
    this.characters.update((a) => a.filter((x) => x.id !== c.id));
    return true;
  }
}
