import { CatalogData } from './catalog';
import { CharacterDraft, EquipmentItem, EquippedWeapon } from './models';

export function requiresTwoHands(item: EquipmentItem): boolean {
  return item.properties?.some((property) => property.toLocaleLowerCase('it') === 'a due mani') ?? false;
}

export function damageForHands(item: EquipmentItem, hands: 1 | 2): string {
  if (hands === 2) {
    const versatile = item.properties?.find((property) =>
      property.toLocaleLowerCase('it').startsWith('versatile '),
    );
    if (versatile) return versatile.slice('versatile '.length);
  }
  return item.damage ?? '';
}

export function hasTwoWeaponFighting(draft: CharacterDraft): boolean {
  return Object.values(draft.classFeatureChoices ?? {}).some((choices) =>
    choices.includes('two-weapon-fighting'),
  );
}

export function equippedWeaponItems(
  draft: CharacterDraft,
  catalog: CatalogData,
): { equipped: EquippedWeapon; item: EquipmentItem }[] {
  return (draft.equippedWeapons ?? []).flatMap((equipped) => {
    const item = catalog.equipment.find(
      (candidate) => candidate.id === equipped.equipmentId && candidate.category === 'weapon',
    );
    return item ? [{ equipped, item }] : [];
  });
}
