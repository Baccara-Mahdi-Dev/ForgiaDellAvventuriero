import { CharacterDraft } from '../../domain/models';

/** Formato persistito e scambiato dai file JSON. Non modificarlo senza una migrazione. */
export type PersistedCharacterV1 = CharacterDraft;

export class InvalidCharacterError extends Error {
  constructor(message = 'File non riconosciuto') {
    super(message);
    this.name = 'InvalidCharacterError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Decodifica il confine non fidato (file, IndexedDB o localStorage).
 * I campi aggiunti dopo la V1 restano facoltativi e vengono completati dal normalizzatore.
 */
export function decodePersistedCharacter(value: unknown): PersistedCharacterV1 {
  if (!isRecord(value) || value['schemaVersion'] !== 1) throw new InvalidCharacterError();
  if (typeof value['id'] !== 'string' || value['id'].length === 0)
    throw new InvalidCharacterError();
  if (!isFiniteNumber(value['revision']) || typeof value['updatedAt'] !== 'string')
    throw new InvalidCharacterError();
  if (typeof value['name'] !== 'string' || !isRecord(value['abilities']))
    throw new InvalidCharacterError();

  for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    if (!isFiniteNumber(value['abilities'][ability])) throw new InvalidCharacterError();
  }

  const requiredStrings = ['ancestryId', 'classId', 'subclassId', 'backgroundId', 'notes'];
  if (requiredStrings.some((key) => typeof value[key] !== 'string'))
    throw new InvalidCharacterError();
  if (!isFiniteNumber(value['level']) || !isRecord(value['asi'])) throw new InvalidCharacterError();
  if (!Array.isArray(value['featIds']) || !Array.isArray(value['spellIds']))
    throw new InvalidCharacterError();

  return value as unknown as PersistedCharacterV1;
}

export function encodePersistedCharacter(value: CharacterDraft): PersistedCharacterV1 {
  return value;
}
