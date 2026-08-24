import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  gameBiceps,
  gameBrain,
  gameMuscleUp,
  gamePublicSpeaker,
  gameRun,
  gameWisdom,
  gameD4,
  gameD10,
  gameD12,
  gameDiceEightFacesEight,
  gameDiceTwentyFacesTwenty,
  gamePerspectiveDiceSixFacesFour,
  gameRollingDices,
  gameBrainTentacle,
} from '@ng-icons/game-icons';
import {
  ABILITIES,
  ALIGNMENTS,
  SKILLS,
  AbilityKey,
  Background,
  Coins,
  EquipmentCategory,
  EquipmentItem,
  EquippedWeapon,
  HomebrewSpell,
  HOMEBREW_ABILITY_MAX,
  HOMEBREW_ABILITY_MIN,
  HpMethod,
  Spell,
  SpellGrantChoice,
  STEPS,
  StepId,
} from '../../domain/models';
import {
  activeClassFeatureChoices,
  classFeatureChoiceCount,
  normalizeClassProgression,
} from '../../domain/class-progression';
import {
  asiPointTotal,
  asiSlots,
  classChoicesUsed,
  featEligible,
  growthChoicesComplete,
  isRecommendedClass,
  racialFeatSlots,
  spellSelectionLimits,
  spellSlots,
} from '../../domain/rules';
import {
  battleSmithUsesIntelligence,
  damageForHands,
  hasTwoWeaponFighting,
  isBattleSmith,
  isUnarmedStrike,
  magicWeaponBaseCandidates,
  requiresTwoHands,
  resolveWeaponBase,
  unarmedDamage,
} from '../../domain/weapon-loadout';
import { WizardStore } from '../../state/wizard.store';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { CharacterSheetPdfService } from '../../core/character-sheet-pdf.service';
import { SpellCardsPdfService } from '../../core/spell-cards-pdf.service';
import { ClassProgressionComponent } from './class-progression.component';
import { HomebrewEquipmentDialogComponent } from './homebrew-equipment-dialog.component';
import { MagicWeaponBaseDialogComponent } from './magic-weapon-base-dialog.component';
import { EQUIPMENT_RARITY_LABELS, equipmentKind } from '../../domain/homebrew-equipment';
import { equippedEquipmentIds, weaponEffectTotal } from '../../domain/equipment-effects';

interface GrantedSpellSource {
  key: string;
  label: string;
  fixed: { spell: Spell; minLevel: number; note?: string; unlocked: boolean }[];
  choices: SpellGrantChoice[];
}
type EquipmentSortKey = 'name' | 'type' | 'cost' | 'weight' | 'rarity' | 'attunement';
type InventorySortKey = 'name' | 'quantity' | 'unitWeight' | 'totalWeight' | 'usage';
type SortDirection = 'asc' | 'desc';

const EQUIPMENT_RARITY_ORDER = {
  common: 0,
  uncommon: 1,
  rare: 2,
  'very-rare': 3,
  legendary: 4,
  artifact: 5,
  varies: 6,
} as const;

const newHomebrewSpell = (): HomebrewSpell => ({
  id: `homebrew-${crypto.randomUUID()}`,
  name: '',
  level: 0,
  school: 'Evocazione',
  description: '',
  castingTime: 'action',
  duration: 'Istantanea',
  concentration: false,
  components: ['V', 'S'],
});
const SPELLS_PER_PAGE = 4;
const EQUIPMENT_PER_PAGE = 12;
const WEAPON_GROUP_ORDER = [
  'Armi semplici da mischia',
  'Armi semplici a distanza',
  'Armi marziali da mischia',
  'Armi marziali a distanza',
];
const MAGIC_GROUP_LABELS: Record<string, string> = {
  weapon: 'Armi',
  armor: 'Armature',
  shield: 'Scudi',
  tool: 'Strumenti',
  gear: 'Oggetti',
  other: 'Oggetti',
};
@Component({
  selector: 'app-wizard',
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    ThemeToggleComponent,
    ClassProgressionComponent,
    HomebrewEquipmentDialogComponent,
    MagicWeaponBaseDialogComponent,
  ],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardComponent implements OnInit, OnDestroy {
  readonly abilities = ABILITIES;
  readonly alignments = ALIGNMENTS;
  readonly skills = SKILLS;
  readonly steps = STEPS;
  readonly recommendationIcon = gameDiceTwentyFacesTwenty;
  readonly sanityIcon = gameBrainTentacle;
  readonly hitDieIcon = gameRollingDices;
  readonly abilityIcons: Readonly<Record<AbilityKey, string>> = {
    str: gameBiceps,
    dex: gameRun,
    con: gameMuscleUp,
    int: gameBrain,
    wis: gameWisdom,
    cha: gamePublicSpeaker,
  };
  private readonly hitDieIcons: Readonly<Partial<Record<number, string>>> = {
    4: gameD4,
    6: gamePerspectiveDiceSixFacesFour,
    8: gameDiceEightFacesEight,
    10: gameD10,
    12: gameD12,
  };
  readonly step = signal<StepId>('caratteristiche');
  readonly message = signal('');
  readonly armorSearch = signal('');
  readonly equipmentSearch = signal('');
  readonly equipmentCategory = signal<EquipmentCategory | 'magic' | 'all'>('all');
  readonly equipmentPage = signal(1);
  readonly equipmentSortKey = signal<EquipmentSortKey>('name');
  readonly equipmentSortDirection = signal<SortDirection>('asc');
  readonly inventorySortKey = signal<InventorySortKey>('name');
  readonly inventorySortDirection = signal<SortDirection>('asc');
  readonly spellSearch = signal('');
  readonly spellLevelFilter = signal('all');
  readonly spellPage = signal(1);
  readonly homebrewSpellOpen = signal(false);
  readonly homebrewEquipmentOpen = signal(false);
  readonly magicWeaponChoice = signal<EquipmentItem | null>(null);
  readonly homebrewSpell = signal<HomebrewSpell>(newHomebrewSpell());
  readonly homebrewMaterials = signal('');
  readonly homebrewHasDamage = signal(false);
  readonly pdfExporting = signal(false);
  readonly spellCardsExporting = signal(false);
  private sub?: { unsubscribe(): void };
  constructor(
    readonly store: WizardStore,
    private route: ActivatedRoute,
    private router: Router,
    private characterSheetPdf: CharacterSheetPdfService,
    private spellCardsPdf: SpellCardsPdfService,
  ) {}
  ngOnInit() {
    this.sub = this.route.paramMap.subscribe((p) => {
      const id = p.get('id')!,
        step = (p.get('step') || 'caratteristiche') as StepId;
      this.step.set(STEPS.some((x) => x.id === step) ? step : 'caratteristiche');
      window.scrollTo({ top: 0 });
      if (this.store.draft().id !== id) void this.store.load(id);
    });
  }
  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
  get index() {
    return STEPS.findIndex((x) => x.id === this.step());
  }
  get current() {
    return STEPS[this.index];
  }
  get stepTotal() {
    return STEPS.length;
  }
  get slots() {
    return asiSlots(this.store.draft().classId, this.store.draft().level);
  }
  get racialFeatSlots() {
    return racialFeatSlots(this.store.draft().ancestryId);
  }
  get asiPoints() {
    return asiPointTotal(this.store.draft());
  }
  get choicesUsed() {
    return classChoicesUsed(this.store.draft());
  }
  get classFeatsUsed() {
    return Math.max(0, this.store.draft().featIds.length - this.racialFeatSlots);
  }
  get asiPointLimit() {
    return Math.max(0, this.slots - this.classFeatsUsed) * 2;
  }
  get selectedFeats() {
    return this.store.feats.filter((f) => this.store.draft().featIds.includes(f.id));
  }
  get selectedSpells() {
    const granted = new Set(this.grantedSpells.map((spell) => spell.id));
    return this.store.spells.filter(
      (spell) => this.store.draft().spellIds.includes(spell.id) && !granted.has(spell.id),
    );
  }
  get homebrewSpells() {
    return this.store.draft().homebrewSpells ?? [];
  }
  get homebrewEquipment() {
    return this.store.draft().homebrewEquipment ?? [];
  }
  get selectedClassFeatures() {
    const selectedClass = this.store.selectedClass();
    if (!selectedClass) return [];
    const draft = this.store.draft();
    return activeClassFeatureChoices(selectedClass, draft.level, draft.subclassId).flatMap(
      (choice) => {
        const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
        return choice.options
          .filter((option) => selected.has(option.id))
          .map((option) => ({ group: choice.name, ...option }));
      },
    );
  }
  classFeaturesComplete() {
    const draft = this.store.draft();
    return activeClassFeatureChoices(
      this.store.selectedClass(),
      draft.level,
      draft.subclassId,
    ).every(
      (choice) =>
        (draft.classFeatureChoices?.[choice.id]?.length ?? 0) ===
        classFeatureChoiceCount(choice, draft.level),
    );
  }
  get selectedSpellCount() {
    return this.selectedSpells.length + this.homebrewSpells.length;
  }
  get selectedCantripCount() {
    return (
      this.selectedSpells.filter((spell) => spell.level === 0).length +
      this.homebrewSpells.filter((spell) => spell.level === 0).length
    );
  }
  get selectedLeveledSpellCount() {
    return this.selectedSpellCount - this.selectedCantripCount;
  }
  get spellLimits() {
    const draft = this.store.draft();
    const primary = this.store.selectedClass()?.primary;
    const spellcastingModifier = primary ? this.store.derived().modifiers[primary] : 0;
    return spellSelectionLimits(draft.classId, draft.level, spellcastingModifier);
  }
  get grantedSpellSources(): GrantedSpellSource[] {
    const draft = this.store.draft();
    const sources: GrantedSpellSource[] = [];
    const add = (
      key: string,
      label: string,
      grants: { spellId: string; minLevel: number; note?: string }[] = [],
      choices: SpellGrantChoice[] = [],
    ) => {
      const fixed = grants.flatMap((grant) => {
        const spell = this.store.spells.find((item) => item.id === grant.spellId);
        return spell ? [{ spell, ...grant, unlocked: grant.minLevel <= draft.level }] : [];
      });
      const availableChoices = choices.filter((choice) => (choice.minLevel ?? 1) <= draft.level);
      if (fixed.length || availableChoices.length)
        sources.push({ key, label, fixed, choices: availableChoices });
    };
    const ancestry = this.store.selectedAncestry();
    if (ancestry)
      add(`ancestry-${ancestry.id}`, ancestry.name, ancestry.spellGrants, ancestry.spellChoices);
    for (const feat of this.selectedFeats)
      add(`feat-${feat.id}`, `Talento: ${feat.name}`, feat.spellGrants, feat.spellChoices);
    if (draft.classId && draft.subclassId) {
      const subclassGrants = this.store.spells.flatMap((spell) =>
        (spell.subclassGrants ?? [])
          .filter(
            (grant) => grant.classId === draft.classId && grant.subclassId === draft.subclassId,
          )
          .map((grant) => ({
            spellId: spell.id,
            minLevel: grant.minLevel,
            note: grant.note ?? 'Sempre preparato',
          })),
      );
      add(
        `subclass-${draft.classId}-${draft.subclassId}`,
        `Sottoclasse: ${draft.subclassId}`,
        subclassGrants,
      );
    }
    for (const item of this.activeSpellGrantItems)
      add(
        `equipment-${item.id}`,
        `Oggetto: ${item.name}`,
        (item.spellGrants ?? []).map((grant) => ({
          spellId: grant.spellId,
          minLevel: 1,
          note:
            grant.usage === 'at-will'
              ? 'A volontà'
              : grant.usage === 'charges'
                ? `${grant.chargesCost ?? 1} cariche`
                : (grant.notes ?? 'Uso limitato'),
        })),
      );
    return sources;
  }
  get grantedSpells() {
    const ids = new Set([
      ...this.store.fixedGrantedSpellIds(),
      ...this.store.activeGrantedSpellChoiceIds(),
      ...this.activeSpellGrantItems.flatMap((item) =>
        (item.spellGrants ?? []).map((grant) => grant.spellId),
      ),
    ]);
    return this.store.spells.filter((spell) => ids.has(spell.id));
  }
  get activeSpellGrantItems() {
    const equipped = equippedEquipmentIds(this.store.draft());
    const attuned = new Set(this.store.draft().attunedEquipmentIds ?? []);
    return this.store.equipment.filter(
      (item) =>
        equipped.has(item.id) &&
        (!item.requiresAttunement || attuned.has(item.id)) &&
        !!item.spellGrants?.length,
    );
  }
  grantCandidates(choice: SpellGrantChoice) {
    const tradition = choice.traditionKey
      ? this.store.draft().spellGrantTraditions?.[choice.traditionKey]
      : undefined;
    const classes = choice.classes ?? (tradition ? [tradition] : []);
    if (choice.traditionKey && !tradition && !choice.classes) return [];
    return this.store.spells.filter(
      (spell) =>
        spell.level === choice.level &&
        (!classes.length || classes.some((classId) => spell.classes.includes(classId))) &&
        (!choice.schools?.length || choice.schools.includes(spell.school)),
    );
  }
  grantChoiceValue(choiceId: string, index: number) {
    return this.store.draft().grantedSpellChoices?.[choiceId]?.[index] ?? '';
  }
  setGrantedSpellChoice(choice: SpellGrantChoice, index: number, spellId: string) {
    const allChoices = { ...(this.store.draft().grantedSpellChoices ?? {}) };
    const values = [...(allChoices[choice.id] ?? [])];
    if (spellId) {
      const duplicate = values.indexOf(spellId);
      if (duplicate >= 0 && duplicate !== index) values[duplicate] = '';
    }
    values[index] = spellId;
    allChoices[choice.id] = values;
    this.store.patch({ grantedSpellChoices: allChoices });
  }
  setGrantTradition(key: string, classId: string) {
    const traditions = { ...(this.store.draft().spellGrantTraditions ?? {}), [key]: classId };
    const choices = { ...(this.store.draft().grantedSpellChoices ?? {}) };
    for (const source of this.grantedSpellSources)
      for (const choice of source.choices) if (choice.traditionKey === key) choices[choice.id] = [];
    this.store.patch({ spellGrantTraditions: traditions, grantedSpellChoices: choices });
  }
  traditionName(id: string) {
    return this.store.classes.find((item) => item.id === id)?.name ?? id;
  }
  proficiencyNames(values: string[]) {
    const labels: Record<string, string> = {
      clothing: 'Abiti',
      light: 'Armature leggere',
      medium: 'Armature medie',
      heavy: 'Armature pesanti',
      shield: 'Scudi',
      simple: 'Armi semplici',
      martial: 'Armi da guerra',
    };
    return values
      .map(
        (value) =>
          labels[value] || this.store.equipment.find((item) => item.id === value)?.name || value,
      )
      .join(', ');
  }
  itemKind(item: EquipmentItem) {
    return equipmentKind(item);
  }
  itemRarity(item: EquipmentItem) {
    return item.rarity ? EQUIPMENT_RARITY_LABELS[item.rarity] : '';
  }
  choiceIndexes(count: number) {
    return Array.from({ length: count }, (_, index) => index);
  }
  get filteredSpells() {
    const query = this.spellSearch().trim().toLocaleLowerCase('en');
    const level = this.spellLevelFilter();
    return this.store
      .availableSpells()
      .filter(
        (spell) =>
          (level === 'all' || String(spell.level) === level) &&
          (!query ||
            spell.name.toLocaleLowerCase('en').includes(query) ||
            spell.school.toLocaleLowerCase('en').includes(query) ||
            spell.description.toLocaleLowerCase('en').includes(query)),
      );
  }
  get visibleSpells() {
    const start = (this.currentSpellPage - 1) * SPELLS_PER_PAGE;
    return this.filteredSpells.slice(start, start + SPELLS_PER_PAGE);
  }
  get spellPageCount() {
    return Math.max(1, Math.ceil(this.filteredSpells.length / SPELLS_PER_PAGE));
  }
  get currentSpellPage() {
    return Math.min(this.spellPage(), this.spellPageCount);
  }
  setSpellSearch(value: string) {
    this.spellSearch.set(value);
    this.spellPage.set(1);
  }
  setSpellLevelFilter(value: string) {
    this.spellLevelFilter.set(value);
    this.spellPage.set(1);
  }
  setSpellPage(page: number) {
    this.spellPage.set(Math.max(1, Math.min(this.spellPageCount, page)));
  }
  get spellSlots() {
    const draft = this.store.draft();
    return spellSlots(draft.classId, draft.level);
  }
  get armorGroups() {
    const query = this.armorSearch().trim().toLocaleLowerCase('it');
    const items = this.store.equipment.filter(
      (item) =>
        item.category === 'armor' &&
        item.armorType !== 'shield' &&
        (!query || item.name.toLocaleLowerCase('it').includes(query)),
    );
    return [...new Set(items.map((item) => item.group))].map((name) => ({
      name,
      items: items.filter((item) => item.group === name),
    }));
  }
  private get filteredEquipment() {
    const query = this.equipmentSearch().trim().toLocaleLowerCase('it');
    const category = this.equipmentCategory();
    const magicView = category === 'magic';
    return this.store.equipment.filter(
      (item) =>
        (magicView
          ? !!item.magical
          : category === 'all'
            ? true
            : !item.magical && item.category === category) &&
        (!query ||
          item.name.toLocaleLowerCase('it').includes(query) ||
          item.group.toLocaleLowerCase('it').includes(query)),
    );
  }
  get equipmentItems() {
    const direction = this.equipmentSortDirection() === 'asc' ? 1 : -1;
    const key = this.equipmentSortKey();
    const filtered = [...this.filteredEquipment].sort((a, b) => {
      const left = this.equipmentSortValue(a, key);
      const right = this.equipmentSortValue(b, key);
      if (left === null && right === null) return a.name.localeCompare(b.name, 'it');
      if (left === null) return 1;
      if (right === null) return -1;
      const comparison =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'it', { sensitivity: 'base' });
      return (comparison || a.name.localeCompare(b.name, 'it')) * direction;
    });
    const start = (this.currentEquipmentPage - 1) * EQUIPMENT_PER_PAGE;
    return filtered.slice(start, start + EQUIPMENT_PER_PAGE);
  }
  get equipmentGroups() {
    const category = this.equipmentCategory();
    if (category !== 'weapon' && category !== 'magic')
      return [{ name: '', items: this.equipmentItems }];
    const groups = new Map<string, EquipmentItem[]>();
    for (const item of this.equipmentItems) {
      const name =
        category === 'weapon' ? item.group : (MAGIC_GROUP_LABELS[equipmentKind(item)] ?? 'Oggetti');
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(item);
    }
    const order = category === 'weapon' ? WEAPON_GROUP_ORDER : Object.values(MAGIC_GROUP_LABELS);
    return [...groups.entries()]
      .sort(
        ([left], [right]) =>
          order.indexOf(left) - order.indexOf(right) || left.localeCompare(right, 'it'),
      )
      .map(([name, items]) => ({ name, items }));
  }
  get equipmentFilteredCount() {
    return this.filteredEquipment.length;
  }
  get equipmentPageCount() {
    return Math.max(1, Math.ceil(this.equipmentFilteredCount / EQUIPMENT_PER_PAGE));
  }
  get currentEquipmentPage() {
    return Math.min(this.equipmentPage(), this.equipmentPageCount);
  }
  setEquipmentSearch(value: string) {
    this.equipmentSearch.set(value);
    this.equipmentPage.set(1);
  }
  setEquipmentCategory(value: EquipmentCategory | 'magic' | 'all') {
    this.equipmentCategory.set(value);
    this.equipmentPage.set(1);
  }
  sortEquipment(key: EquipmentSortKey) {
    if (this.equipmentSortKey() === key) {
      this.equipmentSortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.equipmentSortKey.set(key);
      this.equipmentSortDirection.set('asc');
    }
    this.equipmentPage.set(1);
  }
  equipmentSortIndicator(key: EquipmentSortKey) {
    if (this.equipmentSortKey() !== key) return '';
    return this.equipmentSortDirection() === 'asc' ? '↑' : '↓';
  }
  setEquipmentPage(page: number) {
    this.equipmentPage.set(Math.max(1, Math.min(this.equipmentPageCount, page)));
  }
  get inventoryRows() {
    const direction = this.inventorySortDirection() === 'asc' ? 1 : -1;
    const key = this.inventorySortKey();
    return (this.store.draft().inventory ?? [])
      .map((entry) => ({
        entry,
        item: this.store.equipment.find((item) => item.id === entry.equipmentId),
      }))
      .filter((row): row is { entry: typeof row.entry; item: EquipmentItem } => !!row.item)
      .map((row) => ({
        ...row,
        item: row.item.category === 'weapon' ? this.effectiveWeapon(row.item) : row.item,
      }))
      .sort((a, b) => {
        const left = this.inventorySortValue(a, key);
        const right = this.inventorySortValue(b, key);
        const comparison =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), 'it', { sensitivity: 'base' });
        return (comparison || a.item.name.localeCompare(b.item.name, 'it')) * direction;
      });
  }
  sortInventory(key: InventorySortKey) {
    if (this.inventorySortKey() === key) {
      this.inventorySortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.inventorySortKey.set(key);
      this.inventorySortDirection.set('asc');
    }
  }
  inventorySortIndicator(key: InventorySortKey) {
    if (this.inventorySortKey() !== key) return '';
    return this.inventorySortDirection() === 'asc' ? '↑' : '↓';
  }
  private equipmentSortValue(item: EquipmentItem, key: EquipmentSortKey): string | number | null {
    switch (key) {
      case 'name':
        return item.name;
      case 'type':
        return this.itemKind(item);
      case 'cost':
        return this.costInGold(item.cost);
      case 'weight':
        return item.weightKg;
      case 'rarity':
        return item.rarity ? EQUIPMENT_RARITY_ORDER[item.rarity] : null;
      case 'attunement':
        return Number(!!item.requiresAttunement);
    }
  }
  private inventorySortValue(
    row: { entry: { quantity: number }; item: EquipmentItem },
    key: InventorySortKey,
  ): string | number {
    switch (key) {
      case 'name':
        return row.item.name;
      case 'quantity':
        return row.entry.quantity;
      case 'unitWeight':
        return row.item.weightKg;
      case 'totalWeight':
        return row.item.weightKg * row.entry.quantity;
      case 'usage':
        return Number(this.itemIsEquipped(row.item));
    }
  }
  private costInGold(cost: string): number | null {
    const match = cost.toLocaleLowerCase('it').match(/([\d.,]+)\s*(mc|ma|me|mo|mp)/);
    if (!match) return null;
    const amount = Number(match[1].replace(',', '.'));
    const multipliers: Record<string, number> = { mc: 0.01, ma: 0.1, me: 0.5, mo: 1, mp: 10 };
    const multiplier = multipliers[match[2]];
    if (multiplier === undefined) return null;
    return Number.isFinite(amount) ? amount * multiplier : null;
  }
  get equippedWeaponEntries() {
    return (this.store.draft().equippedWeapons ?? [])
      .map((equipped, index) => {
        const item = this.store.equipment.find(
          (candidate) => candidate.id === equipped.equipmentId,
        );
        return { equipped, index, item: item ? this.effectiveWeapon(item) : undefined };
      })
      .filter(
        (entry): entry is { equipped: EquippedWeapon; index: number; item: EquipmentItem } =>
          !!entry.item,
      );
  }
  get classSkillNames() {
    const selected = new Set(this.store.draft().classSkillProficiencies ?? []);
    return this.skills.filter((skill) => selected.has(skill.id)).map((skill) => skill.name);
  }
  backgroundHasClassSkill(background: Background | undefined) {
    return false;
    //if (!background) return false;
    //const classSkills = new Set(this.classSkillNames);
    //return background.skills.some((skill) => classSkills.has(skill));
  }
  backgroundSkillFromClass(skill: string) {
    return this.classSkillNames.includes(skill);
  }
  canEquipShield(shield: EquipmentItem) {
    return (
      equipmentKind(shield) === 'shield' &&
      this.armorAllowed(shield) &&
      this.equippedWeaponEntries.length <= 1 &&
      !this.equippedWeaponEntries.some((entry) => entry.equipped.hands === 2)
    );
  }
  go(step: StepId) {
    void this.router.navigate(['/crea', this.store.draft().id, step]);
  }
  canNavigateTo(targetIndex: number) {
    if (targetIndex <= this.index) return true;
    return STEPS.slice(this.index, targetIndex).every((item) => this.stepComplete(item.id));
  }
  canContinue() {
    return this.stepComplete(this.step());
  }
  private stepComplete(step: StepId) {
    const d = this.store.draft();
    switch (step) {
      case 'caratteristiche':
        return d.abilityMethod !== 'point-buy' || this.store.pointsSpent() === 27;
      case 'razza':
        const ancestry = this.store.selectedAncestry();
        return (
          !!d.ancestryId &&
          (d.ancestryBonusAbilities?.length ?? 0) === (ancestry?.flexibleBonusCount ?? 0) &&
          (d.ancestrySkillProficiencies?.length ?? 0) === (ancestry?.skillChoices ?? 0) &&
          (d.ancestryToolProficiencies?.length ?? 0) === (ancestry?.toolChoices ?? 0)
        );
      case 'classe':
        return (
          !!d.classId &&
          (d.classSkillProficiencies?.length ?? 0) ===
            (this.store.selectedClass()?.skillChoices ?? 0) &&
          (d.level < this.store.selectedClass()!.subclassLevel || !!d.subclassId) &&
          this.classFeaturesComplete()
        );
      case 'background':
        return (
          !!d.backgroundId &&
          !!d.alignment &&
          !this.backgroundHasClassSkill(this.store.selectedBackground())
        );
      case 'livello':
        return (d.hpMethod !== 'manual' || (d.manualHp ?? 0) > 0) && this.classFeaturesComplete();
      case 'talenti':
        return growthChoicesComplete(d, this.store.rulesCatalog);
      case 'riepilogo':
        return !!d.name.trim();
      default:
        return true;
    }
  }
  next() {
    if (!this.canContinue()) {
      this.message.set('Completa le scelte richieste prima di continuare.');
      return;
    }
    this.message.set('');
    this.go(STEPS[Math.min(STEPS.length - 1, this.index + 1)].id);
  }
  previous() {
    if (this.index > 0) this.go(STEPS[this.index - 1].id);
  }
  score(k: AbilityKey, delta: number) {
    const d = this.store.draft(),
      next = d.abilities[k] + delta;
    if (d.abilityMethod === 'point-buy' && (next < 8 || next > 15)) return;
    if (d.abilityMethod === 'custom' && (next < 1 || next > 20)) return;
    this.store.setAbility(k, next);
  }
  toggleSanity() {
    const enabled = !this.store.draft().sanityEnabled;
    this.store.patch({
      sanityEnabled: enabled,
      sanityScore: this.store.draft().sanityScore ?? 8,
    });
  }
  scoreSanity(delta: number) {
    const draft = this.store.draft(),
      current = draft.sanityScore ?? 8,
      next = current + delta;
    if (next < HOMEBREW_ABILITY_MIN || next > HOMEBREW_ABILITY_MAX) return;
    this.store.patch({ sanityScore: next });
  }
  setMethod(method: 'point-buy' | 'standard' | 'custom') {
    this.store.patch({ abilityMethod: method });
    if (method === 'standard')
      this.store.patch({ abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } });
  }
  selectAncestry(id: string) {
    const changed = this.store.draft().ancestryId !== id;
    this.store.patch({
      ancestryId: id,
      ancestryBonusAbilities: changed ? [] : this.store.draft().ancestryBonusAbilities,
      ancestrySkillProficiencies: changed ? [] : this.store.draft().ancestrySkillProficiencies,
      ancestryToolProficiencies: changed ? [] : this.store.draft().ancestryToolProficiencies,
      featIds: changed ? [] : this.store.draft().featIds,
      featAbilityChoices: changed ? {} : this.store.draft().featAbilityChoices,
    });
  }
  toggleAncestryBonus(k: AbilityKey) {
    const selected = this.store.draft().ancestryBonusAbilities ?? [],
      ancestry = this.store.selectedAncestry(),
      limit = ancestry?.flexibleBonusCount ?? 0,
      options = ancestry?.flexibleBonusOptions ?? this.abilities.map((ability) => ability.key);
    if (!options.includes(k)) return;
    if (selected.includes(k))
      this.store.patch({ ancestryBonusAbilities: selected.filter((x) => x !== k) });
    else if (selected.length < limit)
      this.store.patch({ ancestryBonusAbilities: [...selected, k] });
  }
  isClassRecommended(id: string) {
    return isRecommendedClass(id, this.store.derived().finalAbilities);
  }
  selectClass(id: string) {
    const old = this.store.draft().classId;
    this.store.patch({
      classId: id,
      subclassId: old === id ? this.store.draft().subclassId : '',
      classSkillProficiencies: old === id ? this.store.draft().classSkillProficiencies : [],
      classFeatureChoices: old === id ? this.store.draft().classFeatureChoices : {},
      hpRolls: old === id ? this.store.draft().hpRolls : [],
      manualHp: old === id ? this.store.draft().manualHp : undefined,
      asi: old === id ? this.store.draft().asi : {},
      featIds: old === id ? this.store.draft().featIds : [],
      featAbilityChoices: old === id ? this.store.draft().featAbilityChoices : {},
      spellIds: [],
      equippedArmorId: old === id ? this.store.draft().equippedArmorId : '',
      shieldEquipped: old === id ? this.store.draft().shieldEquipped : false,
    });
  }
  setSubclass(value: string) {
    const draft = { ...this.store.draft(), subclassId: value };
    this.store.patch(normalizeClassProgression(draft, this.store.selectedClass()));
  }
  setClassFeatureChoices(classFeatureChoices: Record<string, string[]>) {
    this.store.patch({ classFeatureChoices });
  }
  setLevel(value: string) {
    const level = Number(value),
      needed = Math.max(0, level - 1),
      die = this.store.selectedClass()?.hitDie ?? 1,
      rolls = (this.store.draft().hpRolls ?? []).slice(0, needed);
    if (this.store.draft().hpMethod === 'roll')
      while (rolls.length < needed) rolls.push(Math.floor(Math.random() * die) + 1);
    const progression = normalizeClassProgression(
      { ...this.store.draft(), level },
      this.store.selectedClass(),
    );
    this.store.patch({ level, hpRolls: rolls, ...progression });
  }
  toggleClassSkill(id: string) {
    const selected = this.store.draft().classSkillProficiencies ?? [],
      limit = this.store.selectedClass()?.skillChoices ?? 0;
    if (selected.includes(id))
      this.store.patch({ classSkillProficiencies: selected.filter((value) => value !== id) });
    else if (selected.length < limit)
      this.store.patch({ classSkillProficiencies: [...selected, id] });
  }
  ancestryBonusAllowed(id: AbilityKey) {
    return (
      this.store.selectedAncestry()?.flexibleBonusOptions ?? this.abilities.map((a) => a.key)
    ).includes(id);
  }
  toggleAncestrySkill(id: string) {
    const selected = this.store.draft().ancestrySkillProficiencies ?? [],
      limit = this.store.selectedAncestry()?.skillChoices ?? 0;
    if (selected.includes(id))
      this.store.patch({ ancestrySkillProficiencies: selected.filter((value) => value !== id) });
    else if (selected.length < limit)
      this.store.patch({ ancestrySkillProficiencies: [...selected, id] });
  }
  toggleAncestryTool(tool: string) {
    const selected = this.store.draft().ancestryToolProficiencies ?? [],
      limit = this.store.selectedAncestry()?.toolChoices ?? 0;
    if (selected.includes(tool))
      this.store.patch({ ancestryToolProficiencies: selected.filter((value) => value !== tool) });
    else if (selected.length < limit)
      this.store.patch({ ancestryToolProficiencies: [...selected, tool] });
  }
  setList(field: 'customLanguages' | 'customTools', value: string) {
    this.store.patch({
      [field]: value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }
  alignmentLabel() {
    return (
      this.alignments.find((item) => item.id === this.store.draft().alignment)?.label ||
      'Allineamento'
    );
  }
  setHpMethod(method: HpMethod) {
    this.store.patch({ hpMethod: method });
    if (
      method === 'roll' &&
      (this.store.draft().hpRolls?.length ?? 0) !== Math.max(0, this.store.draft().level - 1)
    )
      this.rollHp();
  }
  rollHp() {
    const die = this.store.selectedClass()?.hitDie;
    if (!die) return;
    this.store.patch({
      hpRolls: Array.from(
        { length: Math.max(0, this.store.draft().level - 1) },
        () => Math.floor(Math.random() * die) + 1,
      ),
    });
  }
  setManualHp(value: string | number) {
    const parsed = Number(value);
    this.store.patch({
      manualHp: Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : undefined,
    });
  }
  stepNumber(i: number) {
    return i < this.index ? '✓' : i + 1;
  }
  bonusText(b: Partial<Record<AbilityKey, number>>) {
    return this.abilities
      .filter((a) => b[a.key])
      .map((a) => `${a.short} +${b[a.key]}`)
      .join(' · ');
  }
  mod(value: number) {
    return value >= 0 ? `+${value}` : `${value}`;
  }
  eligible(id: string) {
    return featEligible(id, this.store.draft(), this.store.rulesCatalog);
  }
  toggleFeat(id: string) {
    if (!this.eligible(id)) return;
    const selected = this.store.draft().featIds.includes(id);
    if (!selected) {
      const nextClassFeats = Math.max(
        0,
        this.store.draft().featIds.length + 1 - this.racialFeatSlots,
      );
      if (nextClassFeats + Math.ceil(this.asiPoints / 2) > this.slots) {
        this.message.set('Ogni sblocco consente un talento oppure un ASI, non entrambi.');
        return;
      }
    }
    this.message.set('');
    this.store.toggleFeat(id);
    if (selected) {
      const choices = { ...(this.store.draft().featAbilityChoices ?? {}) };
      delete choices[id];
      this.store.patch({ featAbilityChoices: choices });
    }
  }
  setFeatAbility(featId: string, ability: AbilityKey | '') {
    const feat = this.store.feats.find((item) => item.id === featId),
      increase = feat?.effects?.abilityIncrease;
    if (!increase || (ability && !increase.options.includes(ability))) return;
    const choices = { ...(this.store.draft().featAbilityChoices ?? {}) },
      previous = choices[featId];
    if (ability) {
      const scoreWithoutThisFeat =
        this.store.derived().finalAbilities[ability] - (previous === ability ? increase.amount : 0);
      if (scoreWithoutThisFeat + increase.amount > 20) {
        this.message.set('L’aumento concesso dal talento porterebbe la caratteristica oltre 20.');
        return;
      }
      choices[featId] = ability;
    } else delete choices[featId];
    this.message.set('');
    this.store.patch({ featAbilityChoices: choices });
  }
  asi(k: AbilityKey, delta: number) {
    const current = this.store.draft().asi[k] || 0;
    if (
      delta > 0 &&
      (this.asiPoints >= this.asiPointLimit || this.store.derived().finalAbilities[k] >= 20)
    ) {
      this.message.set(
        this.store.derived().finalAbilities[k] >= 20
          ? 'Questa caratteristica ha già raggiunto il limite naturale di 20.'
          : 'Gli sblocchi rimanenti sono già stati assegnati.',
      );
      return;
    }
    if (delta < 0 && current <= 0) return;
    this.message.set('');
    this.store.setAsi(k, current + delta);
  }
  isGranted(id: string) {
    return this.grantedSpells.some((spell) => spell.id === id);
  }
  spellLimitReached(spell: Spell) {
    if (this.store.draft().spellIds.includes(spell.id)) return false;
    return spell.level === 0
      ? this.selectedCantripCount >= this.spellLimits.cantrips
      : this.selectedLeveledSpellCount >= this.spellLimits.leveledSpells;
  }
  toggleSpell(spell: Spell) {
    if (this.spellLimitReached(spell)) {
      this.message.set(
        spell.level === 0
          ? `Hai già scelto tutti i ${this.spellLimits.cantrips} trucchetti consentiti.`
          : `Hai già scelto tutti i ${this.spellLimits.leveledSpells} incantesimi consentiti.`,
      );
      return;
    }
    this.message.set('');
    this.store.toggleSpell(spell.id);
  }
  spellLevel(spell: Spell) {
    return spell.level === 0 ? 'Trucchetto' : `Livello ${spell.level}`;
  }
  openHomebrewSpellWizard() {
    this.homebrewSpell.set(newHomebrewSpell());
    this.homebrewMaterials.set('');
    this.homebrewHasDamage.set(false);
    this.homebrewSpellOpen.set(true);
  }
  closeHomebrewSpellWizard() {
    this.homebrewSpellOpen.set(false);
  }
  patchHomebrewSpell(update: Partial<HomebrewSpell>) {
    this.homebrewSpell.update((spell) => ({ ...spell, ...update }));
  }
  toggleHomebrewComponent(component: 'V' | 'S' | 'M', checked: boolean) {
    const components = this.homebrewSpell().components;
    this.patchHomebrewSpell({
      components: checked
        ? [...new Set([...components, component])]
        : components.filter((item) => item !== component),
    });
  }
  saveHomebrewSpell() {
    const spell = this.homebrewSpell();
    if (!spell.name.trim() || !spell.description.trim()) {
      this.message.set('Inserisci almeno nome e descrizione dell’incantesimo homebrew.');
      return;
    }
    const limit = spell.level === 0 ? this.spellLimits.cantrips : this.spellLimits.leveledSpells;
    const selected = spell.level === 0 ? this.selectedCantripCount : this.selectedLeveledSpellCount;
    if (selected >= limit) {
      this.message.set(
        spell.level === 0
          ? `Hai già scelto tutti i ${limit} trucchetti consentiti per questa classe.`
          : `Hai già scelto tutti i ${limit} incantesimi consentiti per questa classe.`,
      );
      return;
    }
    const materials = spell.components.includes('M')
      ? this.homebrewMaterials()
          .split(/\r?\n/)
          .map((material) => material.trim())
          .filter(Boolean)
      : [];
    const damage =
      this.homebrewHasDamage() && spell.damage?.formula?.trim() && spell.damage.type.trim()
        ? { ...spell.damage, formula: spell.damage.formula.trim(), type: spell.damage.type.trim() }
        : undefined;
    this.store.patch({
      homebrewSpells: [
        ...this.homebrewSpells,
        {
          ...spell,
          name: spell.name.trim(),
          description: spell.description.trim(),
          materials,
          damage,
        },
      ],
    });
    this.message.set('Incantesimo homebrew aggiunto.');
    this.closeHomebrewSpellWizard();
  }
  removeHomebrewSpell(id: string) {
    this.store.patch({ homebrewSpells: this.homebrewSpells.filter((spell) => spell.id !== id) });
  }
  castingTime(spell: Spell) {
    if (spell.castingTime.text) return spell.castingTime.text;
    const labels = {
      action: 'azione',
      'bonus-action': 'azione bonus',
      reaction: 'reazione',
      minute: 'minuto',
      hour: 'ora',
      special: 'speciale',
    } as const;
    return `${spell.castingTime.amount} ${labels[spell.castingTime.unit]}`;
  }
  duration(spell: Spell) {
    if (spell.duration.text) return spell.duration.text;
    if (spell.duration.unit === 'instantaneous') return 'Istantanea';
    if (spell.duration.unit === 'until-dispelled') return 'Finché non dissolto';
    if (spell.duration.unit === 'special') return 'Speciale';
    const amount = spell.duration.amount ?? 1,
      labels = {
        round: ['round', 'round'],
        minute: ['minuto', 'minuti'],
        hour: ['ora', 'ore'],
        day: ['giorno', 'giorni'],
      } as const;
    return `${amount} ${labels[spell.duration.unit][amount === 1 ? 0 : 1]}`;
  }
  spellResolution(spell: Spell) {
    const results: string[] = [];
    if (spell.attackRoll)
      results.push(`Attacco ${spell.attackRoll === 'ranged' ? 'a distanza' : 'in mischia'}`);
    const saves = spell.savingThrows?.length
      ? spell.savingThrows
      : spell.savingThrow
        ? [spell.savingThrow]
        : [];
    if (saves.length)
      results.push(
        `TS ${saves
          .map((save) => this.abilities.find((ability) => ability.key === save)?.short)
          .join('/')}`,
      );
    return results.join(' · ') || 'Nessun tiro richiesto';
  }
  spellDescription(spell: Spell) {
    return spell.description.replace(/\s*At Higher Levels\.\s*[\s\S]*$/i, '').trim();
  }
  spellHigherLevels(spell: Spell) {
    return (
      spell.higherLevels ??
      spell.description.match(/At Higher Levels\.\s*([\s\S]+)$/i)?.[1]?.trim() ??
      ''
    );
  }
  armorAllowed(item: EquipmentItem) {
    if (item.armorType === 'clothing') return true;
    const allowed = [
      ...(this.store.selectedClass()?.armorProficiencies ?? []),
      ...(this.store.selectedAncestry()?.armorProficiencies ?? []),
    ];
    const draft = this.store.draft();
    if (
      item.armorType === 'heavy' &&
      ((draft.classId === 'cleric' &&
        ['Dominio della Vita', 'Dominio della Guerra'].includes(draft.subclassId)) ||
        (draft.classId === 'artificer' && draft.subclassId === 'Armorer' && draft.level >= 3))
    )
      return true;
    if (
      ['medium', 'shield'].includes(item.armorType ?? '') &&
      draft.classId === 'bard' &&
      draft.subclassId === 'Collegio del Valore' &&
      draft.level >= 3
    )
      return true;
    return !!item.armorType && allowed.includes(item.armorType);
  }
  selectArmor(item: EquipmentItem) {
    if (!this.armorAllowed(item)) return;
    const previousArmorId = this.store.draft().equippedArmorId;
    const changed = previousArmorId !== item.id;
    const inventory = [...(this.store.draft().inventory ?? [])];
    if (changed && previousArmorId) {
      const previousIndex = inventory.findIndex((entry) => entry.equipmentId === previousArmorId);
      if (previousIndex >= 0) {
        const previous = inventory[previousIndex];
        if (previous.quantity > 1)
          inventory[previousIndex] = { ...previous, quantity: previous.quantity - 1 };
        else inventory.splice(previousIndex, 1);
      }
    }
    if (!inventory.some((entry) => entry.equipmentId === item.id))
      inventory.push({ equipmentId: item.id, quantity: 1 });
    this.store.patch({
      equippedArmorId: item.id,
      inventory,
      ...(changed || item.magical ? { armorMagicBonus: 0 } : {}),
    });
  }
  addShieldToBackpack() {
    const shield = this.store.equipment.find((item) => item.id === 'shield');
    if (!shield) return;
    this.addItem(shield.id);
    this.message.set('Scudo aggiunto allo zaino. Puoi impugnarlo dopo aver liberato una mano.');
  }
  magicWeaponOptions(item: EquipmentItem) {
    return magicWeaponBaseCandidates(item, this.store.equipment);
  }
  addCatalogItem(item: EquipmentItem) {
    if (this.magicWeaponOptions(item).length) {
      this.magicWeaponChoice.set(item);
      return;
    }
    this.addItem(item.id);
  }
  selectMagicWeaponBase(baseEquipmentId: string) {
    const item = this.magicWeaponChoice();
    if (!item || !this.magicWeaponOptions(item).some((option) => option.id === baseEquipmentId))
      return;
    this.store.patch({
      magicWeaponBaseIds: {
        ...(this.store.draft().magicWeaponBaseIds ?? {}),
        [item.id]: baseEquipmentId,
      },
    });
    this.addItem(item.id);
    this.magicWeaponChoice.set(null);
    this.message.set(
      `${item.name} (${this.store.equipment.find((option) => option.id === baseEquipmentId)?.name}) aggiunta allo zaino.`,
    );
  }
  closeMagicWeaponChoice() {
    this.magicWeaponChoice.set(null);
  }
  setShield(equipped: boolean) {
    if (!equipped) {
      this.store.patch({
        shieldEquipped: false,
        equippedShieldId: '',
        shieldMagicBonus: 0,
      });
      return;
    }
    const shield =
      this.store.equipment.find((item) => item.id === this.store.draft().equippedShieldId) ??
      this.store.equipment.find((item) => item.id === 'shield');
    if (shield) this.setShieldItem(shield);
  }
  setShieldItem(item: EquipmentItem) {
    if (!this.canEquipShield(item)) return;
    this.store.patch({
      shieldEquipped: true,
      equippedShieldId: item.id,
      shieldMagicBonus: item.magical ? 0 : (this.store.draft().shieldMagicBonus ?? 0),
    });
    this.ensureInBackpack(item.id);
  }
  addItem(id: string) {
    const inventory = [...(this.store.draft().inventory ?? [])],
      index = inventory.findIndex((entry) => entry.equipmentId === id);
    if (index >= 0)
      inventory[index] = { ...inventory[index], quantity: inventory[index].quantity + 1 };
    else inventory.push({ equipmentId: id, quantity: 1 });
    this.store.patch({ inventory });
  }
  setItemQuantity(id: string, value: string | number) {
    const quantity = Math.max(0, Math.floor(Number(value) || 0));
    const inventory = (this.store.draft().inventory ?? [])
      .map((entry) => (entry.equipmentId === id ? { ...entry, quantity } : entry))
      .filter((entry) => entry.quantity > 0);
    const update: Parameters<WizardStore['patch']>[0] = { inventory };
    if (!inventory.some((entry) => entry.equipmentId === id)) {
      const magicWeaponBaseIds = { ...(this.store.draft().magicWeaponBaseIds ?? {}) };
      delete magicWeaponBaseIds[id];
      update.magicWeaponBaseIds = magicWeaponBaseIds;
    }
    if (!inventory.some((entry) => entry.equipmentId === this.store.draft().equippedArmorId)) {
      update.equippedArmorId = '';
      update.armorMagicBonus = 0;
    }
    if (!inventory.some((entry) => entry.equipmentId === this.store.draft().equippedShieldId)) {
      update.shieldEquipped = false;
      update.equippedShieldId = '';
      update.shieldMagicBonus = 0;
    }
    const equippedWeapons = (this.store.draft().equippedWeapons ?? []).filter(
      (weapon, index, weapons) =>
        index < 2 &&
        inventory.find((entry) => entry.equipmentId === weapon.equipmentId)?.quantity &&
        weapons
          .slice(0, index + 1)
          .filter((candidate) => candidate.equipmentId === weapon.equipmentId).length <=
          (inventory.find((entry) => entry.equipmentId === weapon.equipmentId)?.quantity ?? 0),
    );
    if (equippedWeapons.length !== (this.store.draft().equippedWeapons ?? []).length)
      update.equippedWeapons = equippedWeapons;
    this.store.patch(update);
  }
  updateCoin(kind: keyof Coins, value: string | number) {
    const coins = this.store.draft().coins ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    this.store.patch({ coins: { ...coins, [kind]: Math.max(0, Math.floor(Number(value) || 0)) } });
  }
  effectiveWeapon(item: EquipmentItem) {
    return resolveWeaponBase(
      item,
      this.store.equipment,
      this.store.draft().magicWeaponBaseIds?.[item.id],
    );
  }
  weaponProficient(item: EquipmentItem) {
    const weapon = this.effectiveWeapon(item);
    if (isUnarmedStrike(weapon)) return this.store.draft().classId === 'monk';
    if (isBattleSmith(this.store.draft()) && weapon.proficiency === 'martial') return true;
    const proficiencies = [
      ...(this.store.selectedClass()?.weaponProficiencies ?? []),
      ...(this.store.selectedAncestry()?.weaponProficiencies ?? []),
    ];
    const racialWeapons: Record<string, readonly string[]> = {
      'dwarf-hill': ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'],
      'elf-high': ['longsword', 'shortsword', 'shortbow', 'longbow'],
      'elf-drow': ['rapier', 'shortsword', 'hand-crossbow'],
    };
    return (
      proficiencies.includes(weapon.proficiency ?? '') ||
      proficiencies.includes(weapon.id) ||
      (racialWeapons[this.store.draft().ancestryId] ?? []).includes(weapon.id)
    );
  }
  weaponAbilityModifier(item: EquipmentItem) {
    const weapon = this.effectiveWeapon(item);
    const modifiers = this.store.derived().modifiers;
    if (battleSmithUsesIntelligence(this.store.draft(), weapon)) return modifiers.int;
    if (isUnarmedStrike(weapon) && this.store.draft().classId === 'monk')
      return Math.max(modifiers.str, modifiers.dex);
    return weapon.ranged
      ? modifiers.dex
      : weapon.finesse
        ? Math.max(modifiers.str, modifiers.dex)
        : modifiers.str;
  }
  weaponAttack(item: EquipmentItem, bonus = 0) {
    const weapon = this.effectiveWeapon(item);
    const magicBonus = this.itemMagicActive(weapon)
      ? (weapon.attackBonus ?? weaponEffectTotal(weapon, 'attack-bonus'))
      : 0;
    const value =
      this.weaponAbilityModifier(weapon) +
      (this.weaponProficient(weapon) ? this.store.derived().proficiency : 0) +
      magicBonus +
      Math.max(0, Math.min(3, bonus));
    return this.mod(value);
  }
  weaponDamage(item: EquipmentItem, bonus = 0) {
    return this.weaponDamageWithLoadout(item, 1, false, bonus);
  }
  weaponDamageWithLoadout(item: EquipmentItem, hands: 1 | 2, offHand: boolean, bonus = 0) {
    const weapon = this.effectiveWeapon(item);
    const damage = isUnarmedStrike(weapon)
      ? unarmedDamage(this.store.draft().classId, this.store.draft().level)
      : damageForHands(weapon, hands);
    if (!damage || damage === '—') return '—';
    const value =
      offHand && !hasTwoWeaponFighting(this.store.draft()) ? 0 : this.weaponAbilityModifier(weapon);
    const magicBonus = this.itemMagicActive(weapon)
      ? (weapon.damageBonus ?? weaponEffectTotal(weapon, 'damage-bonus'))
      : 0;
    const total = value + magicBonus + Math.max(0, Math.min(3, bonus));
    const base = total === 0 ? damage : `${damage}${total > 0 ? '+' : '−'}${Math.abs(total)}`;
    const extra = this.itemMagicActive(weapon)
      ? weapon.additionalDamage ||
        weapon.effects?.find((effect) => effect.type === 'extra-damage')?.formula
      : '';
    const extraType =
      weapon.additionalDamageType ||
      weapon.effects?.find((effect) => effect.type === 'extra-damage')?.damageType;
    return extra ? `${base} + ${extra} ${extraType ?? ''}`.trim() : base;
  }
  weaponHandsLabel(equipped: EquippedWeapon) {
    return equipped.hands === 2 ? 'Due mani' : 'Una mano';
  }
  canEquipWeapon(item: EquipmentItem) {
    item = this.effectiveWeapon(item);
    const equipped = this.equippedWeaponEntries;
    const owned =
      this.store.draft().inventory?.find((entry) => entry.equipmentId === item.id)?.quantity ?? 0;
    if (requiresTwoHands(item))
      return owned > 0 && !this.store.draft().shieldEquipped && !equipped.length;
    if (this.store.draft().shieldEquipped)
      return (
        owned > equipped.filter((entry) => entry.item.id === item.id).length && !equipped.length
      );
    return (
      owned > equipped.filter((entry) => entry.item.id === item.id).length &&
      equipped.length < 2 &&
      !equipped.some((entry) => entry.equipped.hands === 2) &&
      !requiresTwoHands(item)
    );
  }
  equipWeapon(item: EquipmentItem) {
    item = this.effectiveWeapon(item);
    if (!this.canEquipWeapon(item)) return;
    this.store.patch({
      equippedWeapons: [
        ...(this.store.draft().equippedWeapons ?? []),
        { equipmentId: item.id, hands: requiresTwoHands(item) ? 2 : 1 },
      ],
    });
  }
  canUseTwoHands(index: number) {
    return (
      this.equippedWeaponEntries.length === 1 &&
      this.equippedWeaponEntries[0]?.index === index &&
      !this.store.draft().shieldEquipped
    );
  }
  setWeaponHands(index: number, hands: 1 | 2) {
    if (hands === 2 && !this.canUseTwoHands(index)) return;
    const equippedWeapons = [...(this.store.draft().equippedWeapons ?? [])];
    if (!equippedWeapons[index]) return;
    equippedWeapons[index] = { ...equippedWeapons[index], hands };
    this.store.patch({ equippedWeapons });
  }
  setWeaponBonus(index: number, value: string | number) {
    const equippedWeapons = [...(this.store.draft().equippedWeapons ?? [])];
    if (!equippedWeapons[index]) return;
    equippedWeapons[index] = {
      ...equippedWeapons[index],
      bonus: Math.max(0, Math.min(3, Math.floor(Number(value) || 0))),
    };
    this.store.patch({ equippedWeapons });
  }
  shieldLevelFor(item: EquipmentItem): number {
    return this.store.draft().equippedShieldId === item.id
      ? (this.store.draft().shieldMagicBonus ?? 0)
      : 0;
  }
  equippedWeaponBonus(item: EquipmentItem): number {
    return (
      this.equippedWeaponEntries.find((entry) => entry.item.id === item.id)?.equipped.bonus ?? 0
    );
  }
  setShieldLevel(item: EquipmentItem, value: string | number) {
    if (this.store.draft().equippedShieldId !== item.id || item.magical) return;
    this.store.patch({
      shieldMagicBonus: Math.max(0, Math.min(3, Math.floor(Number(value) || 0))),
    });
  }
  armorLevelFor(item: EquipmentItem): number {
    return this.store.draft().equippedArmorId === item.id
      ? (this.store.draft().armorMagicBonus ?? 0)
      : 0;
  }
  setArmorLevel(item: EquipmentItem, value: string | number) {
    if (this.store.draft().equippedArmorId !== item.id || item.magical) return;
    this.store.patch({
      armorMagicBonus: Math.max(0, Math.min(3, Math.floor(Number(value) || 0))),
    });
  }
  unequipWeapon(index: number) {
    this.store.patch({
      equippedWeapons: (this.store.draft().equippedWeapons ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  }
  private ensureInBackpack(id: string) {
    if (!(this.store.draft().inventory ?? []).some((entry) => entry.equipmentId === id))
      this.addItem(id);
  }
  openHomebrewEquipmentWizard() {
    this.homebrewEquipmentOpen.set(true);
  }
  closeHomebrewEquipmentWizard() {
    this.homebrewEquipmentOpen.set(false);
  }
  saveHomebrewEquipment(item: EquipmentItem) {
    this.store.patch({
      homebrewEquipment: [...this.homebrewEquipment, item],
      inventory: [
        ...(this.store.draft().inventory ?? []),
        { equipmentId: item.id, quantity: item.quantity ?? 1 },
      ],
      equipmentCharges: item.charges
        ? { ...(this.store.draft().equipmentCharges ?? {}), [item.id]: item.charges.maximum }
        : this.store.draft().equipmentCharges,
    });
    this.homebrewEquipmentOpen.set(false);
    this.message.set(`${item.name} è stato creato e aggiunto allo zaino.`);
  }
  removeHomebrewEquipment(id: string) {
    const draft = this.store.draft();
    const equipmentCharges = { ...(draft.equipmentCharges ?? {}) };
    delete equipmentCharges[id];
    this.store.patch({
      homebrewEquipment: this.homebrewEquipment.filter((item) => item.id !== id),
      inventory: (draft.inventory ?? []).filter((entry) => entry.equipmentId !== id),
      equippedArmorId: draft.equippedArmorId === id ? '' : draft.equippedArmorId,
      equippedShieldId: draft.equippedShieldId === id ? '' : draft.equippedShieldId,
      shieldEquipped: draft.equippedShieldId === id ? false : draft.shieldEquipped,
      armorMagicBonus: draft.equippedArmorId === id ? 0 : (draft.armorMagicBonus ?? 0),
      shieldMagicBonus: draft.equippedShieldId === id ? 0 : (draft.shieldMagicBonus ?? 0),
      equippedWeapons: (draft.equippedWeapons ?? []).filter((weapon) => weapon.equipmentId !== id),
      equippedItemIds: (draft.equippedItemIds ?? []).filter((itemId) => itemId !== id),
      attunedEquipmentIds: (draft.attunedEquipmentIds ?? []).filter((itemId) => itemId !== id),
      equipmentCharges,
    });
  }
  itemIsEquipped(item: EquipmentItem) {
    return equippedEquipmentIds(this.store.draft()).has(item.id);
  }
  toggleGenericEquipment(item: EquipmentItem) {
    if (['weapon', 'armor', 'shield'].includes(equipmentKind(item))) return;
    const selected = this.store.draft().equippedItemIds ?? [];
    this.store.patch({
      equippedItemIds: selected.includes(item.id)
        ? selected.filter((id) => id !== item.id)
        : [...selected, item.id],
    });
  }
  itemIsAttuned(item: EquipmentItem) {
    return (this.store.draft().attunedEquipmentIds ?? []).includes(item.id);
  }
  toggleAttunement(item: EquipmentItem) {
    if (!item.requiresAttunement) return;
    const selected = this.store.draft().attunedEquipmentIds ?? [];
    if (!selected.includes(item.id) && selected.length >= 3) {
      this.message.set('Puoi entrare in sintonia con un massimo di 3 oggetti.');
      return;
    }
    this.store.patch({
      attunedEquipmentIds: selected.includes(item.id)
        ? selected.filter((id) => id !== item.id)
        : [...selected, item.id],
    });
  }
  itemCharges(item: EquipmentItem) {
    return this.store.draft().equipmentCharges?.[item.id] ?? item.charges?.maximum ?? 0;
  }
  changeItemCharges(item: EquipmentItem, amount: number) {
    if (!item.charges) return;
    const current = this.itemCharges(item);
    this.store.patch({
      equipmentCharges: {
        ...(this.store.draft().equipmentCharges ?? {}),
        [item.id]: Math.max(0, Math.min(item.charges.maximum, current + amount)),
      },
    });
  }
  useEquipmentAbility(item: EquipmentItem, cost: number, label: string) {
    if (cost > 0 && this.itemCharges(item) < cost) {
      this.message.set(`Cariche insufficienti per ${label}.`);
      return;
    }
    if (cost > 0) this.changeItemCharges(item, -cost);
    this.message.set(`${label} attivata${cost ? `: consumate ${cost} cariche.` : '.'}`);
  }
  private itemMagicActive(item: EquipmentItem) {
    return !item.requiresAttunement || this.itemIsAttuned(item);
  }
  async exportPdf() {
    if (this.pdfExporting()) return;
    this.pdfExporting.set(true);
    this.message.set('Compilazione della scheda PDF in corso...');
    try {
      await this.characterSheetPdf.download(this.store.draft());
      this.message.set('Scheda PDF compilata e scaricata.');
    } catch {
      this.message.set('Non è stato possibile generare la scheda PDF.');
    } finally {
      this.pdfExporting.set(false);
    }
  }
  async exportSpellCardsPdf() {
    if (this.spellCardsExporting()) return;
    this.spellCardsExporting.set(true);
    this.message.set('Creazione delle carte incantesimo in corso...');
    try {
      await this.spellCardsPdf.download(this.store.draft());
      this.message.set('Carte incantesimo ordinate e scaricate.');
    } catch {
      this.message.set('Seleziona almeno un incantesimo prima di creare le carte PDF.');
    } finally {
      this.spellCardsExporting.set(false);
    }
  }
  diceIcon(hitDie: number): string {
    return this.hitDieIcons[hitDie] ?? this.hitDieIcon;
  }
  abilityIcon(ability: AbilityKey): string {
    return this.abilityIcons[ability];
  }
  async import(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      await this.store.importJson(file);
      this.message.set('Personaggio importato correttamente.');
      this.go('riepilogo');
    } catch {
      this.message.set('File non valido o incompatibile.');
    }
  }
}
