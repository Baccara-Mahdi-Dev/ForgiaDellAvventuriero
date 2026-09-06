import { inject, Injectable } from '@angular/core';
import { CatalogService } from '../../core/catalog.service';
import { CharacterDraft } from '../../domain/models';
import { decodePersistedCharacter } from '../data-access/character-dto';
import { normalizeCharacterDraft } from '../domain/character-draft';
import { CHARACTER_REPOSITORY } from './character.repository';

@Injectable({ providedIn: 'root' })
export class CharacterLibraryService {
  private readonly repository = inject(CHARACTER_REPOSITORY);
  private readonly catalog = inject(CatalogService);

  async list(): Promise<CharacterDraft[]> {
    const data = this.catalog.requireData();
    return (await this.repository.list()).map((value) =>
      normalizeCharacterDraft(decodePersistedCharacter(value), {
        catalogVersion: data.manifest.dataVersion,
        classes: data.classes,
      }),
    );
  }

  remove(id: string): Promise<void> {
    return this.repository.remove(id);
  }
}
