import { InjectionToken } from '@angular/core';
import { PersistedCharacterV1 } from '../data-access/character-dto';

export interface CharacterRepository {
  get(id: string): Promise<unknown | undefined>;
  list(): Promise<unknown[]>;
  put(value: PersistedCharacterV1): Promise<'primary' | 'fallback'>;
  remove(id: string): Promise<void>;
}

export const CHARACTER_REPOSITORY = new InjectionToken<CharacterRepository>('CHARACTER_REPOSITORY');
