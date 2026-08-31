import { AbilityMethod } from '../models/enum/ability-method';

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
export type BackgroundSelectionMode = 'catalog' | 'homebrew';
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
  source: 'PHB' | 'XGE' | 'TCE' | 'WGE' | 'PSA' | 'SCAG' | 'SRD';
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
  isHidden?: boolean;
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
  classProgression?: ClassFeatureDetail[];
  featureChoices?: ClassFeatureChoice[];
  subclassFeatures?: SubclassFeatureChoices[];
  subclassProgressions?: SubclassProgression[];
  subclassSpellLists?: SubclassSpellList[];
  isHidden?: boolean;
}
export interface Subclass extends OptionItem {
  classId: string;
  isHidden?: boolean;
}
export interface ClassFeatureOption {
  id: string;
  name: string;
  description: string;
  kind?: 'skill' | 'tool';
  minLevel?: number;
  requiresSelection?: { choiceId: string; optionId: string };
  activations?: FeatureActivation[];
  resource?: string;
  resourceCost?: string;
}

export type FeatureActivation = 'action' | 'bonus-action' | 'reaction' | 'passive' | 'special';

export interface SubclassSpellList {
  subclassId: string;
  spellIds: string[];
  requiresSelection?: { choiceId: string; optionId: string };
}

export interface ClassFeatureChoice {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  countByLevel: { level: number; count: number }[];
  options: ClassFeatureOption[];
  effect?:
    | 'skill-proficiency'
    | 'skill-expertise'
    | 'skill-proficiency-expertise'
    | 'tool-proficiency'
    | 'weapon-proficiency'
    | 'spell-grant';
  requiresProficiency?: boolean;
  requiresKnownSpell?: boolean;
  requiresSelection?: { choiceId: string; optionId: string };
  /** Permette alla stessa opzione di occupare più slot quando la regola lo prevede. */
  repeatable?: boolean;
  /** Impedisce di riutilizzare opzioni già scelte nei gruppi indicati. */
  exclusiveWithChoices?: string[];
}
export interface SubclassFeatureChoices {
  subclassId: string;
  choices: ClassFeatureChoice[];
}
export interface ClassFeatureDetail {
  level: number;
  name: string;
  description: string;
  activations?: FeatureActivation[];
  resource?: string;
  resourceCost?: string;
  uses?: string;
  recovery?: string;
}
export interface SubclassFeatureDetail extends ClassFeatureDetail {}
export interface SubclassProgression {
  subclassId: string;
  sourceBook: 'PHB' | 'XGE' | 'TCE' | 'PSA' | 'SCAG' | 'EGW';
  sourcePages: { from: number; to: number };
  features: SubclassFeatureDetail[];
}
export type ArmorType = 'clothing' | 'light' | 'medium' | 'heavy' | 'shield';
export type EquipmentCategory = 'armor' | 'weapon' | 'adventuring-gear' | 'artisan-tool';
export type EquipmentKind = 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'other';
export type EquipmentRarity =
  'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary' | 'artifact' | 'varies';
export type EquipmentEffectActivation = 'passive' | 'active';
export type EquipmentEffectType =
  | 'ability-modifier'
  | 'ability-score'
  | 'armor-class'
  | 'initiative'
  | 'attack-bonus'
  | 'damage-bonus'
  | 'extra-damage'
  | 'skill-bonus'
  | 'saving-throw-bonus'
  | 'resistance'
  | 'immunity'
  | 'vulnerability'
  | 'condition'
  | 'speed'
  | 'custom';
export interface EquipmentEffect {
  id: string;
  name: string;
  type: EquipmentEffectType;
  activation: EquipmentEffectActivation;
  value?: number;
  ability?: AbilityKey | 'all';
  target?: string;
  formula?: string;
  damageType?: string;
  trigger?: string;
  condition?: string;
  duration?: string;
  chargesCost?: number;
  requiresEquipped?: boolean;
  requiresAttunement?: boolean;
  description?: string;
}
export interface EquipmentSpellGrant {
  id: string;
  spellId: string;
  usage: 'at-will' | 'charges' | 'per-short-rest' | 'per-long-rest' | 'per-day';
  uses?: number;
  chargesCost?: number;
  notes?: string;
}
export interface EquipmentCharges {
  maximum: number;
  recoveryFormula: string;
  recoveryMoment: 'dawn' | 'dusk' | 'short-rest' | 'long-rest' | 'other';
  recoveryNotes?: string;
}
export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  group: string;
  cost: string;
  weightKg: number;
  source: 'SRD' | 'HOMEBREW';
  description?: string;
  kind?: EquipmentKind;
  rarity?: EquipmentRarity;
  magical?: boolean;
  homebrew?: boolean;
  quantity?: number;
  notes?: string;
  specialProperties?: string;
  requirements?: string;
  requiresAttunement?: boolean;
  attunementRequirements?: string;
  tags?: string[];
  imageUrl?: string;
  effects?: EquipmentEffect[];
  spellGrants?: EquipmentSpellGrant[];
  charges?: EquipmentCharges;
  baseEquipmentId?: string;
  armorBonus?: number;
  attackBonus?: number;
  damageBonus?: number;
  additionalDamage?: string;
  additionalDamageType?: string;
  range?: number;
  longRange?: number;
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
  bonus?: number;
  /** Scelta facoltativa di Battle Ready per le armi magiche del Battle Smith. */
  useIntelligence?: boolean;
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
  toolChoiceCategory?: 'artisan-tool' | 'gaming-set' | 'musical-instrument';
  isHidden?: boolean;
}
export interface Feat extends OptionItem {
  ability?: AbilityKey;
  prerequisite?: string;
  requirements?: FeatRequirements;
  effects?: FeatEffects;
  proficiencyChoices?: FeatProficiencyChoice[];
  spellGrants?: SpellGrant[];
  spellChoices?: SpellGrantChoice[];
  isHidden?: boolean;
}
export interface FeatProficiencyChoice {
  id: string;
  label: string;
  count: number;
  kind: 'skill' | 'tool' | 'skill-or-tool' | 'weapon' | 'expertise' | 'language';
  toolCategory?: 'artisan-tool';
  options?: string[];
}
export interface FeatRequirements {
  minimumLevel?: number;
  spellcasting?: boolean;
  ancestryIds?: string[];
  anyAbility?: { abilities: AbilityKey[]; minimum: number };
}
export interface FeatEffects {
  abilityIncrease?: { amount: number; options: AbilityKey[] };
  savingThrowProficiencyFromAbility?: boolean;
  armorProficiencies?: ArmorType[];
  toolProficiencies?: string[];
  weaponProficiencies?: string[];
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
  isHidden?: boolean;
}
export interface HomebrewSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  description: string;
  castingTime: 'action' | 'bonus-action' | 'reaction';
  duration: string;
  concentration: boolean;
  components: ('V' | 'S' | 'M')[];
  materials?: string[];
  damage?: SpellDamage;
}
export interface SkillDefinition {
  id: string;
  name: string;
  ability: AbilityKey;
}
export interface SkillValue extends SkillDefinition {
  value: number;
  proficient: boolean;
  expertise?: boolean;
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
export interface CharacterFeature extends ClassFeatureDetail {
  id: string;
  sourceType: 'class' | 'subclass' | 'ancestry' | 'choice';
  sourceName: string;
}
export interface CharacterDraft {
  schemaVersion: 1;
  catalogVersion?: string;
  id: string;
  revision: number;
  updatedAt: string;
  name: string;
  alignment?: Alignment | '';
  abilityMethod: AbilityMethod;
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
  backgroundSelectionMode?: BackgroundSelectionMode;
  homebrewBackgroundName?: string;
  homebrewBackgroundDescription?: string;
  homebrewBackgroundSkills?: string[];
  homebrewBackgroundLanguages?: string[];
  homebrewBackgroundTools?: string[];
  customLanguages?: string[];
  customTools?: string[];
  level: number;
  hpMethod?: HpMethod;
  hpRolls?: number[];
  manualHp?: number;
  asi: Partial<AbilityScores>;
  featIds: string[];
  featAbilityChoices?: Record<string, AbilityKey>;
  featProficiencyChoices?: Record<string, string[]>;
  spellIds: string[];
  homebrewSpells?: HomebrewSpell[];
  homebrewEquipment?: EquipmentItem[];
  grantedSpellChoices?: Record<string, string[]>;
  spellGrantTraditions?: Record<string, string>;
  equippedArmorId?: string;
  shieldEquipped?: boolean;
  equippedShieldId?: string;
  equippedWeapons?: EquippedWeapon[];
  magicWeaponBaseIds?: Record<string, string>;
  armorMagicBonus?: number;
  shieldMagicBonus?: number;
  equippedItemIds?: string[];
  attunedEquipmentIds?: string[];
  equipmentCharges?: Record<string, number>;
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
  baseSpeedMeters: number;
  encumbranceSpeedPenaltyMeters: number;
  size: string;
  hitDie: number;
  hitDiceRemaining: number;
  carryingCapacityKg: number;
  moveCapacityKg: number;
  inventoryWeightKg: number;
  encumberedThresholdKg: number;
  heavilyEncumberedThresholdKg: number;
  encumbrance: 'normal' | 'encumbered' | 'heavily-encumbered' | 'over-capacity';
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
