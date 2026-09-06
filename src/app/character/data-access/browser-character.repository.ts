import { Injectable } from '@angular/core';
import { CharacterRepository } from '../application/character.repository';
import { PersistedCharacterV1 } from './character-dto';
import { characterDb } from '../../core/character.database';

const STORAGE_PREFIX = 'forgia:';

@Injectable()
export class BrowserCharacterRepository implements CharacterRepository {
  async get(id: string): Promise<unknown | undefined> {
    try {
      return await characterDb.characters.get(id);
    } catch {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      return raw ? JSON.parse(raw) : undefined;
    }
  }

  async list(): Promise<unknown[]> {
    try {
      return await characterDb.characters.orderBy('updatedAt').reverse().toArray();
    } catch {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .map((key) => JSON.parse(localStorage.getItem(key)!));
    }
  }

  async put(value: PersistedCharacterV1): Promise<'primary' | 'fallback'> {
    try {
      await characterDb.characters.put(value);
      return 'primary';
    } catch {
      localStorage.setItem(`${STORAGE_PREFIX}${value.id}`, JSON.stringify(value));
      return 'fallback';
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await characterDb.characters.delete(id);
    } catch {
      localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    }
  }
}
