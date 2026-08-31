import { Injectable } from '@angular/core';
import { CharacterDraft } from '../domain/models';
import { CatalogService } from './catalog.service';
import { buildCharacterSheetPdf } from './character-sheet-pdf';

const TEMPLATE_URL = '/pdf/scheda-personaggio.pdf';

@Injectable({ providedIn: 'root' })
export class CharacterSheetPdfService {
  constructor(private readonly catalog: CatalogService) {}

  async download(draft: CharacterDraft): Promise<void> {
    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) throw new Error('Modello PDF non disponibile.');
    const bytes = await buildCharacterSheetPdf(
      await response.arrayBuffer(),
      draft,
      this.catalog.requireData(),
    );
    const data = new Uint8Array(bytes);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.filename(draft.name || 'personaggio')}.pdf`;
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
