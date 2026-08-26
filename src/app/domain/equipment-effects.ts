import {
  AbilityKey,
  AbilityScores,
  CharacterDraft,
  EquipmentEffect,
  EquipmentItem,
} from './models';

export function equippedEquipmentIds(draft: CharacterDraft): Set<string> {
  return new Set(
    [
      draft.equippedArmorId,
      draft.equippedShieldId ?? (draft.shieldEquipped ? 'shield' : ''),
      ...(draft.equippedWeapons ?? []).map((weapon) => weapon.equipmentId),
      ...(draft.equippedItemIds ?? []),
    ].filter((id): id is string => !!id),
  );
}

export function activeEquipmentEffects(
  draft: CharacterDraft,
  equipment: readonly EquipmentItem[],
): EquipmentEffect[] {
  const equipped = equippedEquipmentIds(draft);
  const attuned = new Set(draft.attunedEquipmentIds ?? []);
  return equipment
    .filter((item) => equipped.has(item.id))
    .flatMap((item) =>
      (item.effects ?? []).filter(
        (effect) =>
          effect.activation === 'passive' &&
          (!effect.requiresEquipped || equipped.has(item.id)) &&
          (!(item.requiresAttunement || effect.requiresAttunement) || attuned.has(item.id)),
      ),
    );
}

export function equipmentAbilityBonuses(
  effects: readonly EquipmentEffect[],
): Partial<AbilityScores> {
  const result: Partial<AbilityScores> = {};
  for (const effect of effects.filter((candidate) => candidate.type === 'ability-modifier')) {
    for (const ability of effect.ability === 'all'
      ? (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[])
      : effect.ability
        ? [effect.ability]
        : [])
      result[ability] = (result[ability] ?? 0) + (effect.value ?? 0);
  }
  return result;
}

export function equipmentAbilityMinimum(
  ability: AbilityKey,
  current: number,
  effects: readonly EquipmentEffect[],
): number {
  return Math.max(
    current,
    ...effects
      .filter(
        (effect) =>
          effect.type === 'ability-score' &&
          (effect.ability === ability || effect.ability === 'all'),
      )
      .map((effect) => effect.value ?? current),
  );
}

export const equipmentEffectTotal = (
  effects: readonly EquipmentEffect[],
  type: EquipmentEffect['type'],
): number =>
  effects
    .filter((effect) => effect.type === type)
    .reduce((sum, effect) => sum + (effect.value ?? 0), 0);

export function weaponEffectTotal(item: EquipmentItem, type: EquipmentEffect['type']): number {
  return (item.effects ?? [])
    .filter((effect) => effect.activation === 'passive' && effect.type === type)
    .reduce((sum, effect) => sum + (effect.value ?? 0), 0);
}
