export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type StepId =
  | 'caratteristiche'
  | 'razza'
  | 'classe'
  | 'background'
  | 'livello'
  | 'talenti'
  | 'equipaggiamento'
  | 'incantesimi'
  | 'riepilogo'
  | 'esporta';
export type AbilityScores = Record<AbilityKey, number>;
export const HOMEBREW_ABILITY_MIN = 0;
export const HOMEBREW_ABILITY_MAX = 20;
export type HpMethod = 'average' | 'roll' | 'manual';
export type Alignment =
  | 'lawful-good'
  | 'neutral-good'
  | 'chaotic-good'
  | 'lawful-neutral'
  | 'true-neutral'
  | 'chaotic-neutral'
  | 'lawful-evil'
  | 'neutral-evil'
  | 'chaotic-evil'
  | 'unaligned';
export interface OptionItem {
  id: string;
  name: string;
  description: string;
  source: 'PHB' | 'XGE' | 'TCE' | 'WGE' | 'SRD';
}
export interface Ancestry extends OptionItem {
  race: string;
  bonuses: Partial<AbilityScores>;
  speed: number;
  size?: 'Piccola' | 'Media';
  darkvisionMeters?: number;
  resistances?: string[];
  skillProficiencies?: string[];
  hitPointsPerLevel?: number;
  powerfulBuild?: boolean;
  traits: string[];
  traitDetails?: TraitDetail[];
  spellGrants?: SpellGrant[];
  spellChoices?: SpellGrantChoice[];
  languages: string[];
  languageChoices?: number;
  tools?: string[];
  flexibleBonusCount?: number;
  flexibleBonusOptions?: AbilityKey[];
  skillChoices?: number;
  skillChoiceOptions?: string[];
  toolChoices?: number;
  toolOptions?: string[];
  bonusFeat?: boolean;
  armorProficiencies?: ArmorType[];
  weaponProficiencies?: string[];
}
export interface TraitDetail {
  name: string;
  effect: string;
}
export interface SpellGrant {
  spellId: string;
  minLevel: number;
  note?: string;
}
export interface SpellGrantChoice {
  id: string;
  label: string;
  count: number;
  level: number;
  minLevel?: number;
  classes?: string[];
  schools?: string[];
  traditionKey?: string;
  traditionOptions?: string[];
}
export interface CharacterClass extends OptionItem {
  hitDie: number;
  primary: AbilityKey;
  saves: AbilityKey[];
  subclassLevel: number;
  subclasses: string[];
  skillChoices: number;
  skillOptions: string[];
  armorProficiencies?: ArmorType[];
  weaponProficiencies?: string[];
  caster?: 'full' | 'half';
  featureChoices?: ClassFeatureChoice[];
}
export interface ClassFeatureOption {
  id: string;
  name: string;
  description: string;
}
export interface ClassFeatureChoice {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  countByLevel: { level: number; count: number }[];
  options: ClassFeatureOption[];
}
export type ArmorType = 'clothing' | 'light' | 'medium' | 'heavy' | 'shield';
export type EquipmentCategory = 'armor' | 'weapon' | 'adventuring-gear' | 'artisan-tool';
export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  group: string;
  cost: string;
  weightKg: number;
  source: 'SRD';
  armorType?: ArmorType;
  armorClass?: number;
  dexterityBonus?: 'full' | 'max-2' | 'none';
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
  damage?: string;
  damageType?: string;
  properties?: string[];
  ranged?: boolean;
  finesse?: boolean;
  proficiency?: 'simple' | 'martial' | string;
}
export interface InventoryEntry {
  equipmentId: string;
  quantity: number;
}
export interface EquippedWeapon {
  equipmentId: string;
  hands: 1 | 2;
}
export interface Coins {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}
export interface Background extends OptionItem {
  skills: string[];
  languages?: string[];
  languageChoices?: number;
  tools?: string[];
  toolChoices?: number;
}
export interface Feat extends OptionItem {
  ability?: AbilityKey;
  prerequisite?: string;
  requirements?: FeatRequirements;
  effects?: FeatEffects;
  spellGrants?: SpellGrant[];
  spellChoices?: SpellGrantChoice[];
}
export interface FeatRequirements {
  minimumLevel?: number;
  spellcasting?: boolean;
  ancestryIds?: string[];
  anyAbility?: { abilities: AbilityKey[]; minimum: number };
}
export interface FeatEffects {
  abilityIncrease?: { amount: number; options: AbilityKey[] };
  hitPointsPerLevel?: number;
  initiativeBonus?: number;
  passivePerceptionBonus?: number;
  passiveInvestigationBonus?: number;
  notes?: string[];
}
export interface SpellCastingTime {
  amount: number;
  unit: 'action' | 'bonus-action' | 'reaction' | 'minute' | 'hour' | 'special';
  text?: string;
  condition?: string;
}
export interface SpellDuration {
  amount?: number;
  unit: 'instantaneous' | 'round' | 'minute' | 'hour' | 'day' | 'until-dispelled' | 'special';
  concentration: boolean;
  text?: string;
}
export interface SpellDamage {
  formula: string;
  type: string;
  scaling?: string;
  note?: string;
}
export interface SubclassSpellGrant {
  classId: string;
  subclassId: string;
  minLevel: number;
  note?: string;
}
export interface Spell extends OptionItem {
  level: number;
  school: string;
  classes: string[];
  range?: string;
  components?: string;
  castingTime: SpellCastingTime;
  duration: SpellDuration;
  attackRoll?: 'melee' | 'ranged';
  savingThrow?: AbilityKey;
  savingThrows?: AbilityKey[];
  damage?: SpellDamage;
  ritual?: boolean;
  subclassGrants?: SubclassSpellGrant[];
  higherLevels?: string;
}
export interface SkillDefinition {
  id: string;
  name: string;
  ability: AbilityKey;
}
export interface SkillValue extends SkillDefinition {
  value: number;
  proficient: boolean;
}
export interface SavingThrowValue {
  ability: AbilityKey;
  name: string;
  value: number;
  proficient: boolean;
}
export interface ClassResource {
  name: string;
  value: string;
  detail?: string;
}
export interface CharacterDraft {
  schemaVersion: 1;
  catalogVersion?: string;
  id: string;
  revision: number;
  updatedAt: string;
  name: string;
  alignment?: Alignment | '';
  abilityMethod: 'point-buy' | 'standard' | 'custom';
  abilities: AbilityScores;
  sanityEnabled?: boolean;
  sanityScore?: number;
  ancestryId: string;
  ancestryBonusAbilities?: AbilityKey[];
  ancestrySkillProficiencies?: string[];
  ancestryToolProficiencies?: string[];
  classId: string;
  subclassId: string;
  classSkillProficiencies?: string[];
  classFeatureChoices?: Record<string, string[]>;
  backgroundId: string;
  customLanguages?: string[];
  customTools?: string[];
  level: number;
  hpMethod?: HpMethod;
  hpRolls?: number[];
  manualHp?: number;
  asi: Partial<AbilityScores>;
  featIds: string[];
  featAbilityChoices?: Record<string, AbilityKey>;
  spellIds: string[];
  grantedSpellChoices?: Record<string, string[]>;
  spellGrantTraditions?: Record<string, string>;
  equippedArmorId?: string;
  shieldEquipped?: boolean;
  equippedWeapons?: EquippedWeapon[];
  inventory?: InventoryEntry[];
  coins?: Coins;
  currentHp?: number;
  temporaryHp?: number;
  hitDiceSpent?: number;
  inspiration?: boolean;
  deathSaveSuccesses?: number;
  deathSaveFailures?: number;
  age?: string;
  heightCm?: number;
  weightKg?: number;
  appearance?: string;
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  notes: string;
}
export interface DerivedCharacter {
  finalAbilities: AbilityScores;
  modifiers: AbilityScores;
  sanityScore?: number;
  sanityModifier?: number;
  proficiency: number;
  armorClass: number;
  initiative: number;
  maxHp: number;
  experience: number;
  passivePerception: number;
  passiveInvestigation: number;
  savingThrows: SavingThrowValue[];
  speedMeters: number;
  size: string;
  hitDie: number;
  hitDiceRemaining: number;
  carryingCapacityKg: number;
  moveCapacityKg: number;
  inventoryWeightKg: number;
  armorProficient: boolean;
  skills: SkillValue[];
  languages: string[];
  tools: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  resistances: string[];
  senses: string[];
  classResources: ClassResource[];
  spellAttack?: number;
  spellDc?: number;
  preparedSpells: number;
  completed: number;
}
export interface SpellSlot {
  level: number;
  slots: number;
  kind: 'standard' | 'pact' | 'arcanum';
}
export const ABILITIES: readonly { key: AbilityKey; label: string; short: string }[] = [
  { key: 'str', label: 'Forza', short: 'FOR' },
  { key: 'dex', label: 'Destrezza', short: 'DES' },
  { key: 'con', label: 'Costituzione', short: 'COS' },
  { key: 'int', label: 'Intelligenza', short: 'INT' },
  { key: 'wis', label: 'Saggezza', short: 'SAG' },
  { key: 'cha', label: 'Carisma', short: 'CAR' },
];
export const SKILLS: readonly SkillDefinition[] = [
  { id: 'acrobatics', name: 'Acrobazia', ability: 'dex' },
  { id: 'animal-handling', name: 'Addestrare Animali', ability: 'wis' },
  { id: 'arcana', name: 'Arcano', ability: 'int' },
  { id: 'athletics', name: 'Atletica', ability: 'str' },
  { id: 'stealth', name: 'Furtività', ability: 'dex' },
  { id: 'investigation', name: 'Indagare', ability: 'int' },
  { id: 'deception', name: 'Inganno', ability: 'cha' },
  { id: 'intimidation', name: 'Intimidire', ability: 'cha' },
  { id: 'insight', name: 'Intuizione', ability: 'wis' },
  { id: 'medicine', name: 'Medicina', ability: 'wis' },
  { id: 'nature', name: 'Natura', ability: 'int' },
  { id: 'perception', name: 'Percezione', ability: 'wis' },
  { id: 'persuasion', name: 'Persuasione', ability: 'cha' },
  { id: 'sleight-of-hand', name: 'Rapidità di Mano', ability: 'dex' },
  { id: 'religion', name: 'Religione', ability: 'int' },
  { id: 'survival', name: 'Sopravvivenza', ability: 'wis' },
  { id: 'history', name: 'Storia', ability: 'int' },
  { id: 'performance', name: 'Intrattenere', ability: 'cha' },
];
export const ALIGNMENTS: readonly { id: Alignment; label: string }[] = [
  { id: 'lawful-good', label: 'Legale Buono' },
  { id: 'neutral-good', label: 'Neutrale Buono' },
  { id: 'chaotic-good', label: 'Caotico Buono' },
  { id: 'lawful-neutral', label: 'Legale Neutrale' },
  { id: 'true-neutral', label: 'Neutrale Puro' },
  { id: 'chaotic-neutral', label: 'Caotico Neutrale' },
  { id: 'lawful-evil', label: 'Legale Malvagio' },
  { id: 'neutral-evil', label: 'Neutrale Malvagio' },
  { id: 'chaotic-evil', label: 'Caotico Malvagio' },
  { id: 'unaligned', label: 'Senza allineamento' },
];
export const STEPS: readonly { id: StepId; label: string; eyebrow: string }[] = [
  { id: 'caratteristiche', label: 'Caratteristiche', eyebrow: 'Le fondamenta' },
  { id: 'razza', label: 'Discendenza', eyebrow: 'Il retaggio' },
  { id: 'classe', label: 'Classe', eyebrow: 'La vocazione' },
  { id: 'background', label: 'Background', eyebrow: 'La storia' },
  { id: 'livello', label: 'Livello', eyebrow: 'L’esperienza' },
  { id: 'talenti', label: 'Talenti e ASI', eyebrow: 'La crescita' },
  { id: 'equipaggiamento', label: 'Equipaggiamento', eyebrow: 'Lo zaino' },
  { id: 'incantesimi', label: 'Incantesimi', eyebrow: 'La magia' },
  { id: 'riepilogo', label: 'Riepilogo', eyebrow: 'La scheda' },
  { id: 'esporta', label: 'Esporta', eyebrow: 'Il viaggio inizia' },
];
