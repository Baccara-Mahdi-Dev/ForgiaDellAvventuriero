import {
  EquipmentCategory,
  EquipmentEffect,
  EquipmentItem,
  EquipmentKind,
  EquipmentRarity,
} from './models';

export const EQUIPMENT_KIND_LABELS: Readonly<Record<EquipmentKind, string>> = {
  weapon: 'Arma',
  armor: 'Armatura',
  shield: 'Scudo',
  gear: 'Oggetto',
  tool: 'Strumento',
  other: 'Altro',
};

export const EQUIPMENT_RARITY_LABELS: Readonly<Record<EquipmentRarity, string>> = {
  common: 'Comune',
  uncommon: 'Non comune',
  rare: 'Raro',
  'very-rare': 'Molto raro',
  legendary: 'Leggendario',
  artifact: 'Artefatto',
  varies: 'Variabile',
};

const categoryForKind = (kind: EquipmentKind): EquipmentCategory =>
  kind === 'weapon'
    ? 'weapon'
    : kind === 'armor' || kind === 'shield'
      ? 'armor'
      : kind === 'tool'
        ? 'artisan-tool'
        : 'adventuring-gear';

export function newHomebrewEquipment(): EquipmentItem {
  return {
    id: `homebrew-equipment-${crypto.randomUUID()}`,
    name: '',
    description: '',
    kind: 'gear',
    category: 'adventuring-gear',
    group: 'Equipaggiamento homebrew',
    cost: '',
    weightKg: 0,
    quantity: 1,
    source: 'HOMEBREW',
    homebrew: true,
    magical: false,
    rarity: 'common',
    requiresAttunement: false,
    effects: [],
    spellGrants: [],
    tags: [],
  };
}

export function normalizeHomebrewEquipment(item: EquipmentItem): EquipmentItem {
  const kind = item.kind ?? 'gear';
  const normalized: EquipmentItem = {
    ...item,
    kind,
    category: categoryForKind(kind),
    group: item.group?.trim() || 'Equipaggiamento homebrew',
    cost: item.cost?.trim() ?? '',
    weightKg: Math.max(0, Number(item.weightKg) || 0),
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    source: 'HOMEBREW',
    homebrew: true,
    requiresAttunement: item.magical ? !!item.requiresAttunement : false,
    attunementRequirements: item.magical ? item.attunementRequirements?.trim() : undefined,
    effects: (item.effects ?? []).map((effect) => normalizeEffect(effect)),
    spellGrants: item.spellGrants ?? [],
    tags: (item.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
  };
  if (kind === 'shield') {
    normalized.armorType = 'shield';
    normalized.armorClass = Math.max(0, Number(item.armorClass) || 2);
    normalized.dexterityBonus = 'none';
  } else if (kind !== 'armor') {
    normalized.armorType = undefined;
    normalized.armorClass = undefined;
    normalized.dexterityBonus = undefined;
    normalized.strengthRequirement = undefined;
    normalized.stealthDisadvantage = undefined;
  }
  if (kind !== 'weapon') {
    normalized.damage = undefined;
    normalized.damageType = undefined;
    normalized.properties = undefined;
    normalized.ranged = undefined;
    normalized.finesse = undefined;
    normalized.proficiency = undefined;
    normalized.range = undefined;
    normalized.longRange = undefined;
    normalized.attackBonus = undefined;
    normalized.damageBonus = undefined;
    normalized.additionalDamage = undefined;
    normalized.additionalDamageType = undefined;
  }
  return normalized;
}

function normalizeEffect(effect: EquipmentEffect): EquipmentEffect {
  return {
    ...effect,
    id: effect.id || `effect-${crypto.randomUUID()}`,
    name: effect.name?.trim() || 'Effetto',
    value: effect.value === undefined ? undefined : Number(effect.value) || 0,
    chargesCost:
      effect.chargesCost === undefined
        ? undefined
        : Math.max(0, Math.floor(Number(effect.chargesCost) || 0)),
    requiresEquipped: effect.requiresEquipped ?? effect.activation === 'passive',
  };
}

export function validateHomebrewEquipment(
  item: EquipmentItem,
  spellIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  if (!item.name?.trim()) errors.push('Inserisci il nome dell’oggetto.');
  if (!item.description?.trim()) errors.push('Inserisci una descrizione.');
  if (!item.kind) errors.push('Scegli una tipologia.');
  if ((item.weightKg ?? 0) < 0) errors.push('Il peso non può essere negativo.');
  if (item.kind === 'weapon' && (!item.damage?.trim() || !item.damageType?.trim()))
    errors.push('Un’arma deve avere danno base e tipo di danno.');
  if (item.kind === 'armor' && (!item.armorType || item.armorType === 'shield'))
    errors.push('Scegli un tipo di armatura compatibile.');
  if (item.kind === 'armor' && (!Number.isFinite(item.armorClass) || (item.armorClass ?? 0) < 1))
    errors.push('Inserisci una Classe Armatura base valida.');
  if (item.kind === 'shield' && item.armorType && item.armorType !== 'shield')
    errors.push('Uno scudo non può usare un tipo di armatura diverso da scudo.');
  if (item.charges && (!Number.isInteger(item.charges.maximum) || item.charges.maximum < 1))
    errors.push('Il numero massimo di cariche deve essere almeno 1.');
  for (const effect of item.effects ?? []) {
    if (effect.type === 'extra-damage' && (!effect.formula || !effect.damageType))
      errors.push(`Completa dado e tipo di danno per “${effect.name || 'Effetto'}”.`);
    if (
      ['ability-modifier', 'ability-score'].includes(effect.type) &&
      (!effect.ability || !Number.isFinite(effect.value))
    )
      errors.push(`Scegli caratteristica e valore per “${effect.name || 'Effetto'}”.`);
    if ((effect.chargesCost ?? 0) > 0 && !item.charges)
      errors.push(`“${effect.name || 'Effetto'}” consuma cariche, ma l’oggetto non le possiede.`);
  }
  for (const grant of item.spellGrants ?? []) {
    if (!spellIds.has(grant.spellId)) errors.push('Uno degli incantesimi selezionati non esiste.');
    if (grant.usage === 'charges' && (!item.charges || (grant.chargesCost ?? 0) < 1))
      errors.push('Un incantesimo a cariche deve indicare un costo valido.');
  }
  return [...new Set(errors)];
}

export const equipmentKind = (item: EquipmentItem): EquipmentKind =>
  item.kind ??
  (item.category === 'weapon'
    ? 'weapon'
    : item.armorType === 'shield'
      ? 'shield'
      : item.category === 'armor'
        ? 'armor'
        : item.category === 'artisan-tool'
          ? 'tool'
          : 'gear');
