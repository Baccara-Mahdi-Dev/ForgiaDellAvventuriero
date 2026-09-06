import { Injectable } from '@angular/core';
import { CharacterDraft } from '../../domain/models';
import { decodePersistedCharacter, encodePersistedCharacter } from './character-dto';

@Injectable({ providedIn: 'root' })
export class CharacterFileService {
  async read(file: File): Promise<CharacterDraft> {
    return decodePersistedCharacter(JSON.parse(await file.text()));
  }

  download(draft: CharacterDraft): void {
    const blob = new Blob([JSON.stringify(encodePersistedCharacter(draft), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${draft.name || 'personaggio'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
