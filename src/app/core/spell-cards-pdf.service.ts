import { Injectable } from '@angular/core';
import { CharacterDraft } from '../domain/models';
import { CatalogService } from './catalog.service';
import { buildSpellCardsPdf } from './spell-cards-pdf';

@Injectable({ providedIn: 'root' })
export class SpellCardsPdfService {
  constructor(private readonly catalog: CatalogService) {}

  async download(draft: CharacterDraft): Promise<void> {
    const bytes = await buildSpellCardsPdf(draft, this.catalog.requireData());
    const data = new Uint8Array(bytes);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.filename(draft.name || 'personaggio')}-incantesimi.pdf`;
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
