import {
  CharacterDraft,
  DerivedCharacter,
  EquipmentItem,
  EquippedWeapon,
} from '../../domain/models';
import { weaponEffectTotal } from '../../domain/equipment-effects';
import {
  battleSmithUsesIntelligence,
  damageForHands,
  hasTwoWeaponFighting,
  isUnarmedStrike,
  resolveWeaponBase,
  unarmedDamage,
} from '../../domain/weapon-loadout';

export interface WeaponProfile {
  item: EquipmentItem;
  proficient: boolean;
  abilityModifier: number;
  attackBonus: number;
  damageDice: string;
  damageModifier: number;
  additionalDamage?: string;
  additionalDamageType?: string;
  hands: 1 | 2;
  magicActive: boolean;
}

export interface WeaponProfileOptions {
  equipped?: EquippedWeapon;
  hands?: 1 | 2;
  offHand?: boolean;
  bonus?: number;
}

export function computeWeaponProfile(
  draft: CharacterDraft,
  derived: DerivedCharacter,
  equipment: readonly EquipmentItem[],
  rawItem: EquipmentItem,
  options: WeaponProfileOptions = {},
): WeaponProfile {
  const item = resolveWeaponBase(rawItem, equipment, draft.magicWeaponBaseIds?.[rawItem.id]);
  const equipped = options.equipped;
  const hands = options.hands ?? equipped?.hands ?? 1;
  const bonus = Math.max(0, Math.min(3, options.bonus ?? equipped?.bonus ?? 0));
  const proficient =
    (isUnarmedStrike(item) && draft.classId === 'monk') ||
    derived.weaponProficiencies.includes(item.id) ||
    derived.weaponProficiencies.includes(item.proficiency ?? '');
  const abilityModifier = battleSmithUsesIntelligence(draft, item, equipped)
    ? derived.modifiers.int
    : isUnarmedStrike(item) && draft.classId === 'monk'
      ? Math.max(derived.modifiers.str, derived.modifiers.dex)
      : item.ranged
        ? derived.modifiers.dex
        : item.finesse
          ? Math.max(derived.modifiers.str, derived.modifiers.dex)
          : derived.modifiers.str;
  const magicActive =
    !item.requiresAttunement || (draft.attunedEquipmentIds ?? []).includes(item.id);
  const magicAttack = magicActive
    ? (item.attackBonus ?? weaponEffectTotal(item, 'attack-bonus'))
    : 0;
  const magicDamage = magicActive
    ? (item.damageBonus ?? weaponEffectTotal(item, 'damage-bonus'))
    : 0;
  const damageDice = isUnarmedStrike(item)
    ? unarmedDamage(draft.classId, draft.level)
    : damageForHands(item, hands);
  const offHandModifier = options.offHand && !hasTwoWeaponFighting(draft) ? 0 : abilityModifier;

  return {
    item,
    proficient,
    abilityModifier,
    attackBonus: abilityModifier + (proficient ? derived.proficiency : 0) + magicAttack + bonus,
    damageDice,
    damageModifier: offHandModifier + magicDamage + bonus,
    additionalDamage: magicActive
      ? (item.additionalDamage ??
        item.effects?.find((effect) => effect.type === 'extra-damage')?.formula)
      : undefined,
    additionalDamageType:
      item.additionalDamageType ??
      item.effects?.find((effect) => effect.type === 'extra-damage')?.damageType,
    hands,
    magicActive,
  };
}
