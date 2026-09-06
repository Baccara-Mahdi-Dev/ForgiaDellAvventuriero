import Dexie, { Table } from 'dexie';
import { PersistedCharacterV1 } from '../character/data-access/character-dto';
export class CharacterDatabase extends Dexie {
  characters!: Table<PersistedCharacterV1, string>;
  constructor() {
    super('ForgiaAvventurieroDB');
    this.version(1).stores({ characters: 'id, updatedAt, revision' });
    this.version(2).stores({ characters: 'id, updatedAt, revision, name' });
  }
}
export const characterDb = new CharacterDatabase();
