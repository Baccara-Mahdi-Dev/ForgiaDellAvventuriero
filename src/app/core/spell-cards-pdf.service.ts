import { Injectable } from '@angular/core';
import { CharacterDraft, Spell } from '../domain/models';
import { CatalogService } from './catalog.service';
import { buildSpellCardsPdf, buildSpellCardsPdfFromSpells } from './spell-cards-pdf';

@Injectable({ providedIn: 'root' })
export class SpellCardsPdfService {
  constructor(private readonly catalog: CatalogService) {}

  async download(draft: CharacterDraft): Promise<void> {
    const bytes = await buildSpellCardsPdf(draft, this.catalog.requireData());
    this.downloadBytes(bytes, `${this.filename(draft.name || 'personaggio')}-incantesimi.pdf`);
  }

  async downloadSpells(spells: readonly Spell[]): Promise<void> {
    const bytes = await buildSpellCardsPdfFromSpells(spells, 'Card incantesimo');
    this.downloadBytes(bytes, 'card-incantesimo.pdf');
  }

  private downloadBytes(bytes: Uint8Array, filename: string): void {
    const data = new Uint8Array(bytes);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private filename(value: string): string {
    return (
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'personaggio'
    );
  }
}
