import { CharacterDraft, EquipmentItem, EquippedWeapon } from './models';

export const ARTIFICER_SUBCLASSES = {
  alchemist: ['Alchimista', 'Alchemist'],
  armorer: ['Armorer', 'Armaiolo'],
  artillerist: ['Artigliere', 'Artillerist'],
  battleSmith: ['Fabbro da Battaglia', 'Battle Smith'],
} as const;

export function isArtificerSubclass(
  draft: Pick<CharacterDraft, 'classId' | 'subclassId' | 'level'>,
  subclass: keyof typeof ARTIFICER_SUBCLASSES,
  minimumLevel = 3,
): boolean {
  return (
    draft.classId === 'artificer' &&
    draft.level >= minimumLevel &&
    (ARTIFICER_SUBCLASSES[subclass] as readonly string[]).includes(draft.subclassId)
  );
}

/** Slot di sintonia concessi dalla progressione Magic Item Adept/Savant/Master. */
export function attunementLimit(draft: Pick<CharacterDraft, 'classId' | 'level'>): number {
  if (draft.classId !== 'artificer') return 3;
  if (draft.level >= 18) return 6;
  if (draft.level >= 14) return 5;
  if (draft.level >= 10) return 4;
  return 3;
}

export function battleSmithCanUseIntelligence(
  draft: Pick<CharacterDraft, 'classId' | 'subclassId' | 'level'>,
  item: EquipmentItem,
): boolean {
  return isArtificerSubclass(draft, 'battleSmith') && item.category === 'weapon' && !!item.magical;
}

export function battleSmithUsesIntelligence(
  draft: Pick<CharacterDraft, 'classId' | 'subclassId' | 'level'>,
  item: EquipmentItem,
  equipped?: Pick<EquippedWeapon, 'useIntelligence'>,
): boolean {
  return battleSmithCanUseIntelligence(draft, item) && equipped?.useIntelligence !== false;
}
