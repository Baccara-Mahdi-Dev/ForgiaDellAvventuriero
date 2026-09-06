import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterDraft } from '../../domain/models';
import { WizardStore } from '../../state/wizard.store';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { NgIcon, provideIcons } from '@ng-icons/core';

import { monoDelete } from '@ng-icons/mono-icons';
import { CharacterLibraryService } from '../../character/application/character-library.service';
import { tuiDialog } from '@taiga-ui/core';
import { CatalogService } from '../../core/catalog.service';
import { QuickCharacterDialogComponent } from './quick-character-dialog.component';
import { buildQuickCharacter } from './quick-character';
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
  private readonly quickCharacterDialog = tuiDialog(QuickCharacterDialogComponent, {
    label: 'Creazione rapida · Livello 1',
    size: 'l',
  });
  constructor(
    readonly store: WizardStore,
    private readonly library: CharacterLibraryService,
    private readonly catalog: CatalogService,
    private router: Router,
    private feedback: UiFeedbackService,
  ) {}
  async ngOnInit() {
    this.characters.set((await this.library.list()).filter((x) => x.name || x.revision > 0));
  }
  create() {
    const d = this.store.newDraft();
    void this.router.navigate(['/crea', d.id, 'caratteristiche']);
  }
  createQuick() {
    this.quickCharacterDialog({
      classes: this.store.classes,
      ancestries: this.store.ancestries,
    }).subscribe({
      next: (selection) => {
        try {
          const draft = buildQuickCharacter(selection, this.catalog.requireData());
          this.store.replaceDraft(draft);
          void this.router.navigate(['/crea', draft.id, 'riepilogo']);
        } catch {
          this.feedback.error(
            'Non è stato possibile completare il personaggio con le scelte indicate.',
            'Creazione rapida fallita',
          );
        }
      },
    });
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
      const removed = await Promise.all(cs.map((character) => this.rmpg(character)));
      if (removed.every(Boolean))
        this.feedback.success('Tutti gli avventurieri son stati eliminati.');
    }
  }
  private async rmpg(c: CharacterDraft) {
    try {
      await this.library.remove(c.id);
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
