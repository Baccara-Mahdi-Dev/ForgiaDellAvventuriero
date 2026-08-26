import { CatalogData } from './catalog';
import { CharacterDraft, EquipmentItem, EquippedWeapon } from './models';
import { isArtificerSubclass } from './artificer-rules';

export { battleSmithUsesIntelligence } from './artificer-rules';

const SWORD_IDS = new Set(['greatsword', 'longsword', 'rapier', 'scimitar', 'shortsword']);
const AXE_IDS = new Set(['battleaxe', 'greataxe', 'handaxe']);

function inferredFixedBaseId(item: EquipmentItem): string | undefined {
  const requirement = item.specialProperties?.toLocaleLowerCase('it') ?? '';
  if (requirement.startsWith('bastone,')) return 'quarterstaff';
  if (requirement.includes('arma (maglio)')) return 'maul';
  if (requirement.includes('arma (martello da guerra)')) return 'warhammer';
  if (requirement.includes('arma (mazza)')) return 'mace';
  return undefined;
}

export function isBattleSmith(draft: Pick<CharacterDraft, 'classId' | 'subclassId' | 'level'>) {
  return isArtificerSubclass(draft, 'battleSmith');
}

export function magicWeaponBaseCandidates(
  item: EquipmentItem,
  equipment: readonly EquipmentItem[],
): EquipmentItem[] {
  const requirement = item.specialProperties?.toLocaleLowerCase('it') ?? '';
  if (item.category !== 'weapon' || !item.magical || !requirement.includes('qualsiasi')) return [];
  if (requirement.includes('munizione')) return [];
  return equipment.filter((candidate) => {
    if (candidate.category !== 'weapon' || candidate.magical || isUnarmedStrike(candidate))
      return false;
    const sword = SWORD_IDS.has(candidate.id);
    const axe = AXE_IDS.has(candidate.id);
    if (requirement.includes('ascia o spada') && !sword && !axe) return false;
    if (requirement.includes('spada') && !requirement.includes('ascia o spada') && !sword)
      return false;
    if (requirement.includes('ascia') && !requirement.includes('ascia o spada') && !axe)
      return false;
    return !requirement.includes('danni taglienti') || candidate.damageType === 'taglienti';
  });
}

export function resolveWeaponBase(
  item: EquipmentItem,
  equipment: readonly EquipmentItem[],
  selectedBaseId?: string,
): EquipmentItem {
  const flexible = magicWeaponBaseCandidates(item, equipment);
  const inferredBaseId = inferredFixedBaseId(item);
  const baseId = flexible.length ? selectedBaseId : item.baseEquipmentId || inferredBaseId;
  const base = baseId ? equipment.find((candidate) => candidate.id === baseId) : undefined;
  if (!base) return item;
  const useBaseDamage = flexible.length > 0 || (!!inferredBaseId && !item.baseEquipmentId);
  return {
    ...item,
    name: `${item.name} (${base.name})`,
    weightKg: item.weightKg || base.weightKg,
    damage: useBaseDamage ? base.damage : (item.damage ?? base.damage),
    damageType: useBaseDamage ? base.damageType : (item.damageType ?? base.damageType),
    properties: base.properties,
    ranged: base.ranged,
    finesse: base.finesse,
    proficiency: base.proficiency,
    range: base.range,
    longRange: base.longRange,
  };
}

export function requiresTwoHands(item: EquipmentItem): boolean {
  return (
    item.properties?.some((property) => property.toLocaleLowerCase('it') === 'a due mani') ?? false
  );
}

export function isUnarmedStrike(item: EquipmentItem): boolean {
  return item.tags?.includes('unarmed') ?? false;
}

export function unarmedDamage(classId: string, level: number): string {
  if (classId !== 'monk') return '1d4';
  if (level >= 17) return '1d10';
  if (level >= 11) return '1d8';
  if (level >= 5) return '1d6';
  return '1d4';
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
  catalog: Pick<CatalogData, 'equipment'>,
): { equipped: EquippedWeapon; item: EquipmentItem }[] {
  return (draft.equippedWeapons ?? []).flatMap((equipped) => {
    const rawItem = catalog.equipment.find(
      (candidate) => candidate.id === equipped.equipmentId && candidate.category === 'weapon',
    );
    const item = rawItem
      ? resolveWeaponBase(rawItem, catalog.equipment, draft.magicWeaponBaseIds?.[rawItem.id])
      : undefined;
    return item ? [{ equipped, item }] : [];
  });
}
