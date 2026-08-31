import Dexie, { Table } from 'dexie';
import { CharacterDraft } from '../domain/models';
export class CharacterDatabase extends Dexie {
  characters!: Table<CharacterDraft, string>;
  constructor() {
    super('ForgiaAvventurieroDB');
    this.version(1).stores({ characters: 'id, updatedAt, revision' });
    this.version(2).stores({ characters: 'id, updatedAt, revision, name' });
  }
}
export const characterDb = new CharacterDatabase();
