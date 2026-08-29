import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
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
  gameSwordBrandish,
  gameMagicSwirl,
  gameNextButton,
  gamePreviousButton,
  gameScrollQuill,
  gameSparkles,
} from '@ng-icons/game-icons';
import {
  fluentAdd,
  fluentBackpack,
  fluentBackpackAdd,
  fluentDelete,
  fluentSubtract,
} from '@ng-icons/fluent-ui';
import { iconoirUndoAction, iconoirShuffle } from '@ng-icons/iconoir/regular';
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
  FeatProficiencyChoice,
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
  acquiredCharacterFeatures,
  activeClassFeatureChoices,
  classFeatureChoiceCount,
  normalizeClassProgression,
} from '../../domain/class-progression';
import {
  asiPointTotal,
  asiSlots,
  classToolProficiencies,
  classChoicesUsed,
  featEligible,
  growthChoicesComplete,
  isRecommendedClass,
  racialFeatSlots,
  spellSelectionLimits,
  spellSlots,
  subclassSpellcastingProfile,
} from '../../domain/rules';
import {
  battleSmithUsesIntelligence,
  damageForHands,
  hasTwoWeaponFighting,
  isUnarmedStrike,
  magicWeaponBaseCandidates,
  requiresTwoHands,
  resolveWeaponBase,
  unarmedDamage,
} from '../../domain/weapon-loadout';
import { WizardStore } from '../../state/wizard.store';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { ClassProgressionComponent } from './class-progression.component';
import { EquipmentStepComponent } from './steps/equipment-step.component';
import { SpellsStepComponent } from './steps/spells-step.component';
import { SummaryStepComponent } from './steps/summary-step.component';
import { EQUIPMENT_RARITY_LABELS, equipmentKind } from '../../domain/homebrew-equipment';
import { equippedEquipmentIds, weaponEffectTotal } from '../../domain/equipment-effects';
import {
  attunementLimit,
  battleSmithCanUseIntelligence,
  isArtificerSubclass,
} from '../../domain/artificer-rules';
import { AbilityMethod } from '../../models/enum/ability-method';
import { TuiDropdown } from '@taiga-ui/core';
import { TuiAvatar, TuiChevron, TuiDataListWrapper, TuiSelect, TuiSkeleton } from '@taiga-ui/kit';

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
const FEATS_PER_PAGE = 4;
const BACKGROUNDS_PER_PAGE = 6;
const EQUIPMENT_PER_PAGE = 12;
const LANGUAGE_OPTIONS = [
  'Abissale',
  'Celestiale',
  'Comune',
  'Draconico',
  'Elfico',
  'Gigante',
  'Gnomesco',
  'Goblin',
  'Halfling',
  'Infernale',
  'Nanico',
  'Orchesco',
  'Primordiale',
  'Gergo delle Profondità',
  'Silvano',
  'Sottocomune',
] as const;
const GENERAL_TOOL_OPTIONS = [
  'Arnesi da scasso',
  'Borsa da erborista',
  'Kit da avvelenatore',
  'Strumenti da falsario',
  'Strumenti da navigatore',
  'Trucchi per il camuffamento',
  'Veicoli acquatici',
  'Veicoli terrestri',
] as const;
const GAMING_SET_OPTIONS = [
  'Set di dadi',
  'Mazzo di carte',
  'Scacchi dei Draghi',
  'Tre Draghi al Buio',
] as const;
const MUSICAL_INSTRUMENT_OPTIONS = [
  'Cornamusa',
  'Flauto',
  'Flauto di Pan',
  'Liuto',
  'Lira',
  'Oboe',
  'Tamburo',
  'Salterio',
  'Viola',
  'Zufolo',
] as const;
const ARTISAN_TOOL_OPTIONS = [
  'Scorte da alchimista',
  'Scorte da birraio',
  'Scorte da calligrafo',
  'Scorte da pittore',
  'Strumenti da calzolaio',
  'Strumenti da carpentiere',
  'Strumenti da cartografo',
  'Strumenti da conciatore',
  'Strumenti da fabbro',
  'Strumenti da gioielliere',
  'Strumenti da intagliatore',
  'Strumenti da inventore',
  'Strumenti da muratore',
  'Strumenti da soffiatore di vetro',
  'Strumenti da tessitore',
  'Strumenti da vasaio',
  'Utensili da cuoco',
] as const;
const TOOL_OPTIONS = [
  ...GENERAL_TOOL_OPTIONS,
  ...GAMING_SET_OPTIONS,
  ...MUSICAL_INSTRUMENT_OPTIONS,
  ...ARTISAN_TOOL_OPTIONS,
] as const;
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
    EquipmentStepComponent,
    SpellsStepComponent,
    SummaryStepComponent,
    TuiAvatar,
    TuiChevron,
    TuiDataListWrapper,
    TuiDropdown,
    TuiSelect,
    TuiSkeleton,
  ],
  providers: [
    provideIcons({
      iconoirShuffle,
      iconoirUndoAction,
      fluentBackpackAdd,
      fluentBackpack,
      fluentDelete,
      fluentAdd,
      fluentSubtract,
      gameSwordBrandish,
      gameMagicSwirl,
      gameNextButton,
      gamePreviousButton,
      gameScrollQuill,
      gameSparkles,
    }),
  ],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardComponent implements OnInit, OnDestroy {
  readonly self = this;
  readonly AbilityMethod = AbilityMethod;
  readonly abilities = ABILITIES;
  readonly alignments = ALIGNMENTS;
  readonly languageOptions = LANGUAGE_OPTIONS;
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
  readonly armorSearch = signal('');
  readonly featSearch = signal('');
  readonly featPage = signal(1);
  readonly backgroundPage = signal(1);
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
  readonly removalRequest = signal<{
    item: EquipmentItem;
    available: number;
    quantity: number;
  } | null>(null);
  readonly homebrewSpell = signal<HomebrewSpell>(newHomebrewSpell());
  readonly homebrewMaterials = signal('');
  readonly homebrewHasDamage = signal(false);
  readonly pdfExporting = signal(false);
  readonly spellCardsExporting = signal(false);
  private sub?: { unsubscribe(): void };
  private holdTimeout?: ReturnType<typeof setTimeout>;
  private holdInterval?: ReturnType<typeof setInterval>;
  private isHolding = false;
  readonly loadedAncestryImages = signal(new Set<string>());

  constructor(
    readonly store: WizardStore,
    private route: ActivatedRoute,
    private router: Router,
    private injector: Injector,
    private feedback: UiFeedbackService,
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
  get filteredFeats() {
    const query = this.featSearch().trim().toLocaleLowerCase('it');
    return this.store.feats.filter(
      (feat) =>
        !query ||
        feat.name.toLocaleLowerCase('it').includes(query) ||
        feat.description.toLocaleLowerCase('it').includes(query) ||
        feat.source.toLocaleLowerCase('it').includes(query),
    );
  }
  get featPageCount() {
    return Math.max(1, Math.ceil(this.filteredFeats.length / FEATS_PER_PAGE));
  }
  get pagedFeats() {
    const page = Math.min(this.featPage(), this.featPageCount);
    return this.filteredFeats.slice((page - 1) * FEATS_PER_PAGE, page * FEATS_PER_PAGE);
  }
  get backgroundPageCount() {
    return Math.max(1, Math.ceil(this.store.backgrounds.length / BACKGROUNDS_PER_PAGE));
  }
  get currentBackgroundPage() {
    return Math.min(this.backgroundPage(), this.backgroundPageCount);
  }
  get pagedBackgrounds() {
    const start = (this.currentBackgroundPage - 1) * BACKGROUNDS_PER_PAGE;
    return this.store.backgrounds.slice(start, start + BACKGROUNDS_PER_PAGE);
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
    return activeClassFeatureChoices(
      selectedClass,
      draft.level,
      draft.subclassId,
      draft.classFeatureChoices,
    ).flatMap((choice) => {
      const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
      return choice.options
        .filter((option) => selected.has(option.id))
        .map((option) => ({ group: choice.name, ...option }));
    });
  }
  get acquiredFeatures() {
    return acquiredCharacterFeatures(
      this.store.draft(),
      this.store.selectedClass(),
      this.store.selectedAncestry(),
    );
  }
  resourceUses(resourceName: string) {
    return this.acquiredFeatures.filter((feature) => feature.resource === resourceName);
  }
  classFeaturesComplete() {
    const draft = this.store.draft();
    return activeClassFeatureChoices(
      this.store.selectedClass(),
      draft.level,
      draft.subclassId,
      draft.classFeatureChoices,
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
    return spellSelectionLimits(draft.classId, draft.level, spellcastingModifier, draft.subclassId);
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
    return spellSlots(draft.classId, draft.level, draft.subclassId);
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
  backgroundToolChoiceSummary(background: Background) {
    switch (background.toolChoiceCategory) {
      case 'gaming-set':
        return 'strumento da gioco a scelta';
      case 'artisan-tool':
        return 'strumento da artigiano a scelta';
      case 'musical-instrument':
        return 'strumento musicale a scelta';
      default:
        return 'strumento a scelta';
    }
  }
  get languageChoiceLimit() {
    return (
      (this.store.selectedAncestry()?.languageChoices ?? 0) +
      (this.store.selectedBackground()?.languageChoices ?? 0)
    );
  }
  get toolChoiceLimit() {
    return (
      (this.store.selectedBackground()?.toolChoices ?? 0) + this.backgroundToolConflicts.length
    );
  }
  get fixedLanguages() {
    return [
      ...(this.store.selectedAncestry()?.languages ?? []),
      ...(this.store.selectedBackground()?.languages ?? []),
    ];
  }
  get fixedTools() {
    return [
      ...(this.store.selectedAncestry()?.tools ?? []),
      ...(this.store.draft().ancestryToolProficiencies ?? []),
      ...classToolProficiencies(this.store.draft(), this.store.selectedClass()),
      ...(this.store.selectedBackground()?.tools ?? []),
    ].filter((value, index, all) => all.indexOf(value) === index);
  }
  get knownToolsBeforeBackground() {
    return [
      ...(this.store.selectedAncestry()?.tools ?? []),
      ...(this.store.draft().ancestryToolProficiencies ?? []),
      ...classToolProficiencies(this.store.draft(), this.store.selectedClass()),
    ].filter((value, index, all) => all.indexOf(value) === index);
  }
  get backgroundToolConflicts() {
    const known = new Set(this.knownToolsBeforeBackground);
    return (this.store.selectedBackground()?.tools ?? []).filter((tool) => known.has(tool));
  }
  get toolOptions(): readonly string[] {
    const category = this.store.selectedBackground()?.toolChoiceCategory;
    const prescribed =
      category === 'gaming-set'
        ? GAMING_SET_OPTIONS
        : category === 'artisan-tool'
          ? ARTISAN_TOOL_OPTIONS
          : category === 'musical-instrument'
            ? MUSICAL_INSTRUMENT_OPTIONS
            : TOOL_OPTIONS;
    if (!this.backgroundToolConflicts.length) return prescribed;
    return [...new Set([...prescribed, ...TOOL_OPTIONS])];
  }
  get toolChoiceLabel() {
    const category = this.store.selectedBackground()?.toolChoiceCategory;
    const base =
      category === 'gaming-set'
        ? 'Strumenti da gioco a scelta'
        : category === 'artisan-tool'
          ? 'Strumenti da artigiano a scelta'
          : category === 'musical-instrument'
            ? 'Strumenti musicali a scelta'
            : 'Strumenti a scelta';
    return this.backgroundToolConflicts.length ? `${base} e sostituzioni` : base;
  }
  canEquipShield(shield: EquipmentItem) {
    return (
      equipmentKind(shield) === 'shield' &&
      this.equippedWeaponEntries.length <= 1 &&
      !this.equippedWeaponEntries.some((entry) => entry.equipped.hands === 2)
    );
  }

  shieldProficient(shield: EquipmentItem) {
    return this.armorAllowed(shield);
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
        return d.abilityMethod !== AbilityMethod.POINT || this.store.pointsSpent() === 27;
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
            (this.store.selectedClass()?.skillChoices ?? 0)
        );
      case 'background':
        return (
          !!d.backgroundId &&
          !!d.alignment &&
          (d.customLanguages?.length ?? 0) === this.languageChoiceLimit &&
          (d.customTools?.length ?? 0) === this.toolChoiceLimit &&
          !this.backgroundHasClassSkill(this.store.selectedBackground())
        );
      case 'livello':
        return (
          (d.hpMethod !== 'manual' || (d.manualHp ?? 0) > 0) &&
          (d.level < (this.store.selectedClass()?.subclassLevel ?? 21) || !!d.subclassId) &&
          this.classFeaturesComplete()
        );
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
      this.feedback.warning('Completa le scelte richieste prima di continuare.');
      return;
    }
    this.go(STEPS[Math.min(STEPS.length - 1, this.index + 1)].id);
  }
  previous() {
    if (this.index > 0) this.go(STEPS[this.index - 1].id);
  }
  score(k: AbilityKey, delta: number) {
    const d = this.store.draft(),
      next = d.abilities[k] + delta;
    if (d.abilityMethod === AbilityMethod.POINT && (next < 8 || next > 15)) return;
    if (d.abilityMethod === AbilityMethod.STANDARD && (next < 1 || next > 20)) return;
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
  setMethod(method: AbilityMethod) {
    this.store.patch({ abilityMethod: method });
    if (method === AbilityMethod.STANDARD)
      this.store.patch({ abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } });
  }
  startHold(key: AbilityKey, val: number) {
    this.isHolding = false;
    this.holdTimeout = setTimeout(() => {
      this.isHolding = true;
      this.score(key, val);
      this.holdInterval = setInterval(() => {
        this.score(key, val);
      }, 100);
    }, 350);
  }
  endHold() {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = undefined;
    }

    if (this.holdInterval) {
      clearInterval(this.holdInterval);
      this.holdInterval = undefined;
    }
  }
  handleClick(key: AbilityKey, val: number) {
    if (!this.isHolding) {
      this.score(key, val);
    }
    this.isHolding = false;
  }
  startSanityHold(val: number) {
    this.isHolding = false;

    this.holdTimeout = setTimeout(() => {
      this.isHolding = true;

      this.scoreSanity(val);

      this.holdInterval = setInterval(() => {
        this.scoreSanity(val);
      }, 100);
    }, 350);
  }

  handleSanityClick(val: number) {
    if (!this.isHolding) {
      this.scoreSanity(val);
    }

    this.isHolding = false;
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
      customLanguages: changed ? [] : this.store.draft().customLanguages,
      customTools: changed ? [] : this.store.draft().customTools,
    });
  }
  selectBackground(id: string) {
    if (this.store.draft().backgroundId === id) return;
    this.store.patch({ backgroundId: id, customLanguages: [], customTools: [] });
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
    return isRecommendedClass(id, this.classRecommendationAbilities);
  }

  get classRecommendationAbilities() {
    const draft = this.store.draft();
    const ancestry = this.store.selectedAncestry();
    return Object.fromEntries(
      this.abilities.map(({ key }) => [
        key,
        draft.abilities[key] +
          (ancestry?.bonuses[key] ?? 0) +
          ((draft.ancestryBonusAbilities ?? []).includes(key) &&
          (!ancestry?.flexibleBonusOptions || ancestry.flexibleBonusOptions.includes(key))
            ? 1
            : 0),
      ]),
    ) as Record<AbilityKey, number>;
  }

  skillAbilityShort(skillId: string): string {
    const ability = this.skills.find((skill) => skill.id === skillId)?.ability;
    return this.abilities.find((item) => item.key === ability)?.short ?? '';
  }

  backgroundSkillShort(skillName: string): string {
    const ability = this.skills.find((skill) => skill.name === skillName)?.ability;
    return this.abilities.find((item) => item.key === ability)?.short ?? '';
  }

  get progressionProficiencyIds(): string[] {
    const draft = this.store.draft();
    const selected = new Set([
      ...(draft.classSkillProficiencies ?? []),
      ...(draft.ancestrySkillProficiencies ?? []),
      ...(this.store.selectedAncestry()?.skillProficiencies ?? []),
      ...(this.store.selectedBackground()?.skills ?? []).flatMap((name) => {
        const skill = this.skills.find((candidate) => candidate.name === name);
        return skill ? [skill.id] : [];
      }),
      ...(draft.classId === 'rogue' ? ['thieves-tools'] : []),
    ]);
    for (const choice of activeClassFeatureChoices(
      this.store.selectedClass(),
      draft.level,
      draft.subclassId,
      draft.classFeatureChoices,
    )) {
      if (choice.effect !== 'skill-proficiency') continue;
      for (const optionId of draft.classFeatureChoices?.[choice.id] ?? []) selected.add(optionId);
    }
    return [...selected];
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
      customTools: old === id ? this.store.draft().customTools : [],
      equippedArmorId: old === id ? this.store.draft().equippedArmorId : '',
      shieldEquipped: old === id ? this.store.draft().shieldEquipped : false,
      attunedEquipmentIds: (this.store.draft().attunedEquipmentIds ?? []).slice(
        0,
        attunementLimit({ classId: id, level: this.store.draft().level }),
      ),
    });
  }
  setSubclass(value: string) {
    const draft = { ...this.store.draft(), subclassId: value };
    this.store.patch(normalizeClassProgression(draft, this.store.selectedClass()));
  }
  setClassFeatureChoices(classFeatureChoices: Record<string, string[]>) {
    this.store.patch(
      normalizeClassProgression(
        { ...this.store.draft(), classFeatureChoices },
        this.store.selectedClass(),
      ),
    );
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
    this.store.patch({
      level,
      hpRolls: rolls,
      attunedEquipmentIds: (this.store.draft().attunedEquipmentIds ?? []).slice(
        0,
        attunementLimit({ classId: this.store.draft().classId, level }),
      ),
      ...progression,
    });
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
  toggleBackgroundChoice(field: 'customLanguages' | 'customTools', value: string) {
    const selected = this.store.draft()[field] ?? [];
    const limit = field === 'customLanguages' ? this.languageChoiceLimit : this.toolChoiceLimit;
    if (selected.includes(value))
      this.store.patch({ [field]: selected.filter((item) => item !== value) });
    else if (selected.length < limit) this.store.patch({ [field]: [...selected, value] });
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
        this.feedback.warning('Ogni sblocco consente un talento oppure un ASI, non entrambi.');
        return;
      }
    }
    this.store.toggleFeat(id);
    if (selected) {
      const choices = { ...(this.store.draft().featAbilityChoices ?? {}) };
      delete choices[id];
      const proficiencyChoices = { ...(this.store.draft().featProficiencyChoices ?? {}) };
      for (const choice of this.store.feats.find((feat) => feat.id === id)?.proficiencyChoices ??
        [])
        delete proficiencyChoices[choice.id];
      this.store.patch({
        featAbilityChoices: choices,
        featProficiencyChoices: proficiencyChoices,
      });
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
        this.feedback.warning(
          'L’aumento concesso dal talento porterebbe la caratteristica oltre 20.',
        );
        return;
      }
      choices[featId] = ability;
    } else delete choices[featId];
    this.store.patch({ featAbilityChoices: choices });
    if (
      ability &&
      feat?.effects?.savingThrowProficiencyFromAbility &&
      this.store.selectedClass()?.saves.includes(ability)
    )
      this.feedback.info(
        `Hai già competenza nei tiri salvezza di ${this.abilities.find((item) => item.key === ability)?.label}. La scelta resta consentita, ma il bonus di competenza non si somma.`,
      );
  }
  setFeatSearch(value: string) {
    this.featSearch.set(value);
    this.featPage.set(1);
  }
  setFeatPage(page: number) {
    this.featPage.set(Math.max(1, Math.min(this.featPageCount, page)));
  }
  setBackgroundPage(page: number) {
    this.backgroundPage.set(Math.max(1, Math.min(this.backgroundPageCount, page)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  featChoiceOptions(choice: FeatProficiencyChoice) {
    const skills = this.skills.map((skill) => ({ id: skill.id, name: skill.name }));
    if (choice.kind === 'skill')
      return choice.options?.length
        ? skills.filter((skill) => choice.options!.includes(skill.id))
        : skills;
    if (choice.kind === 'expertise')
      return this.store
        .derived()
        .skills.filter((skill) => skill.proficient)
        .map((skill) => ({ id: skill.id, name: skill.name }));
    const tools = (
      choice.toolCategory === 'artisan-tool' ? ARTISAN_TOOL_OPTIONS : TOOL_OPTIONS
    ).map((name) => ({ id: name, name }));
    if (choice.kind === 'tool') return tools;
    if (choice.kind === 'language') return LANGUAGE_OPTIONS.map((name) => ({ id: name, name }));
    if (choice.kind === 'skill-or-tool')
      return [
        ...skills.map((item) => ({ id: `skill:${item.id}`, name: `Abilità · ${item.name}` })),
        ...tools.map((item) => ({ id: `tool:${item.id}`, name: `Strumento · ${item.name}` })),
      ];
    return this.store.equipment
      .filter((item) => item.category === 'weapon' && !item.magical)
      .map((item) => ({ id: item.id, name: item.name }));
  }
  featAbilityOptions(featId: string) {
    const increase = this.store.feats.find((feat) => feat.id === featId)?.effects?.abilityIncrease;
    if (!increase) return [];
    return this.abilities
      .filter((ability) => increase.options.includes(ability.key))
      .map((ability) => `${ability.label} +${increase.amount}`);
  }
  featAbilitySelection(featId: string): string | null {
    const selected = this.store.draft().featAbilityChoices?.[featId];
    if (!selected) return null;
    return (
      this.featAbilityOptions(featId).find((label) =>
        label.startsWith(`${this.abilities.find((ability) => ability.key === selected)?.label} `),
      ) ?? null
    );
  }
  setFeatAbilitySelection(featId: string, label: string | null) {
    const ability = this.abilities.find((item) => label?.startsWith(`${item.label} `));
    this.setFeatAbility(featId, ability?.key ?? '');
  }
  featChoiceSlots(choice: FeatProficiencyChoice) {
    return Array.from({ length: choice.count }, (_, index) => index);
  }
  featChoiceSelection(choice: FeatProficiencyChoice, index: number): string | null {
    const selectedId = this.store.draft().featProficiencyChoices?.[choice.id]?.[index];
    return this.featChoiceOptions(choice).find((option) => option.id === selectedId)?.name ?? null;
  }
  featChoiceItems(choice: FeatProficiencyChoice, index: number) {
    const selected = this.store.draft().featProficiencyChoices?.[choice.id] ?? [];
    const current = selected[index];
    return this.featChoiceOptions(choice)
      .filter((option) => option.id === current || !selected.includes(option.id))
      .map((option) => option.name);
  }
  featChoiceSlotDisabled(choice: FeatProficiencyChoice, index: number) {
    return index > (this.store.draft().featProficiencyChoices?.[choice.id]?.length ?? 0);
  }
  setFeatProficiencySelection(
    choice: FeatProficiencyChoice,
    index: number,
    optionName: string | null,
  ) {
    const all = { ...(this.store.draft().featProficiencyChoices ?? {}) };
    const current = [...(all[choice.id] ?? [])];
    if (!optionName) {
      current.splice(index, 1);
      all[choice.id] = current;
      this.store.patch({ featProficiencyChoices: all });
      return;
    }
    const option = this.featChoiceOptions(choice).find((item) => item.name === optionName);
    if (!option || current.some((id, selectedIndex) => id === option.id && selectedIndex !== index))
      return;
    if (index > current.length) return;
    current[index] = option.id;
    all[choice.id] = current;
    this.store.patch({ featProficiencyChoices: all });
  }
  asi(k: AbilityKey, delta: number) {
    const current = this.store.draft().asi[k] || 0;
    if (
      delta > 0 &&
      (this.asiPoints >= this.asiPointLimit || this.store.derived().finalAbilities[k] >= 20)
    ) {
      this.feedback.warning(
        this.store.derived().finalAbilities[k] >= 20
          ? 'Questa caratteristica ha già raggiunto il limite naturale di 20.'
          : 'Gli sblocchi rimanenti sono già stati assegnati.',
      );
      return;
    }
    if (delta < 0 && current <= 0) return;
    this.store.setAsi(k, current + delta);
  }
  isGranted(id: string) {
    return this.grantedSpells.some((spell) => spell.id === id);
  }
  spellLimitReached(spell: Spell) {
    if (this.store.draft().spellIds.includes(spell.id)) return false;
    const draft = this.store.draft();
    const subclassCaster = subclassSpellcastingProfile(
      draft.classId,
      draft.subclassId,
      draft.level,
    );
    if (
      spell.level > 0 &&
      subclassCaster &&
      !subclassCaster.schools.includes(spell.school) &&
      this.selectedSpells.filter(
        (selected) => selected.level > 0 && !subclassCaster.schools.includes(selected.school),
      ).length >= subclassCaster.unrestrictedLeveledSpells
    )
      return true;
    return spell.level === 0
      ? this.selectedCantripCount >= this.spellLimits.cantrips
      : this.selectedLeveledSpellCount >= this.spellLimits.leveledSpells;
  }
  toggleSpell(spell: Spell) {
    if (this.spellLimitReached(spell)) {
      const draft = this.store.draft();
      const subclassCaster = subclassSpellcastingProfile(
        draft.classId,
        draft.subclassId,
        draft.level,
      );
      if (spell.level > 0 && subclassCaster && !subclassCaster.schools.includes(spell.school)) {
        this.feedback.warning(
          `Hai già scelto tutti gli incantesimi senza vincolo di scuola consentiti a questo livello.`,
        );
        return;
      }
      this.feedback.warning(
        spell.level === 0
          ? `Hai già scelto tutti i ${this.spellLimits.cantrips} trucchetti consentiti.`
          : `Hai già scelto tutti i ${this.spellLimits.leveledSpells} incantesimi consentiti.`,
      );
      return;
    }
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
      this.feedback.warning('Inserisci almeno nome e descrizione dell’incantesimo homebrew.');
      return;
    }
    const limit = spell.level === 0 ? this.spellLimits.cantrips : this.spellLimits.leveledSpells;
    const selected = spell.level === 0 ? this.selectedCantripCount : this.selectedLeveledSpellCount;
    if (selected >= limit) {
      this.feedback.warning(
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
    this.feedback.success('Incantesimo homebrew aggiunto.');
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
        [
          'Dominio della Vita',
          'Dominio della Guerra',
          'Dominio della Natura',
          'Dominio della Tempesta',
          'Dominio della Forgia',
          "Dominio dell'Ordine",
          'Dominio del Crepuscolo',
          'Dominio della Solidarietà',
          'Dominio della Forza',
          'Dominio dello Zelo',
        ].includes(draft.subclassId)) ||
        isArtificerSubclass(draft, 'armorer'))
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
    const previousEncumbrance = this.store.derived().encumbrance;
    const previousArmorId = this.store.draft().equippedArmorId;
    const changed = previousArmorId !== item.id;
    const inventory = [...(this.store.draft().inventory ?? [])];
    const addedToBackpack = !inventory.some((entry) => entry.equipmentId === item.id);
    let removedArmorName = '';
    if (changed && previousArmorId) {
      const previousIndex = inventory.findIndex((entry) => entry.equipmentId === previousArmorId);
      if (previousIndex >= 0) {
        const previous = inventory[previousIndex];
        removedArmorName =
          this.store.equipment.find((candidate) => candidate.id === previousArmorId)?.name ??
          'Armatura precedente';
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
    this.notifyEncumbranceIncrease(previousEncumbrance);
    if (removedArmorName)
      this.feedback.info(`${removedArmorName} rimossa dallo zaino.`, 'Oggetto rimosso');
    if (addedToBackpack)
      this.feedback.success(`${item.name} aggiunta e indossata.`, 'Equipaggiamento aggiornato');
  }
  addShieldToBackpack() {
    const shield = this.store.equipment.find((item) => item.id === 'shield');
    if (!shield) return;
    this.addItem(shield.id);
  }
  magicWeaponOptions(item: EquipmentItem) {
    return magicWeaponBaseCandidates(item, this.store.equipment);
  }
  addCatalogItem(item: EquipmentItem) {
    if (this.magicWeaponOptions(item).length) {
      this.magicWeaponChoice.set(item);
      return;
    }
    this.addItem(item.id, false);
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
    this.feedback.success(
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
  addItem(id: string, notify = true) {
    const previousEncumbrance = this.store.derived().encumbrance;
    const inventory = [...(this.store.draft().inventory ?? [])],
      index = inventory.findIndex((entry) => entry.equipmentId === id);
    if (index >= 0)
      inventory[index] = { ...inventory[index], quantity: inventory[index].quantity + 1 };
    else inventory.push({ equipmentId: id, quantity: 1 });
    this.store.patch({ inventory });
    this.notifyEncumbranceIncrease(previousEncumbrance);
    if (notify) {
      const item = this.store.equipment.find((candidate) => candidate.id === id);
      this.feedback.success(`${item?.name ?? 'Oggetto'} aggiunto allo zaino.`, 'Oggetto aggiunto');
    }
  }
  setItemQuantity(id: string, value: string | number) {
    const previousEncumbrance = this.store.derived().encumbrance;
    const previousQuantity =
      this.store.draft().inventory?.find((entry) => entry.equipmentId === id)?.quantity ?? 0;
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
    this.notifyEncumbranceIncrease(previousEncumbrance);
    const item = this.store.equipment.find((candidate) => candidate.id === id);
    const itemName = item?.name ?? 'Oggetto';
    if (quantity > previousQuantity)
      this.feedback.success(
        `${itemName}: aggiunt${quantity - previousQuantity === 1 ? 'a' : `e ${quantity - previousQuantity} unità`} allo zaino.`,
        'Oggetto aggiunto',
      );
    else if (quantity < previousQuantity)
      this.feedback.info(
        quantity === 0
          ? `${itemName} rimosso dallo zaino.`
          : `${itemName}: rimosse ${previousQuantity - quantity} unità dallo zaino.`,
        'Oggetto rimosso',
      );
  }

  removeItem(item: EquipmentItem): void {
    const available =
      this.store.draft().inventory?.find((entry) => entry.equipmentId === item.id)?.quantity ?? 0;
    if (available <= 0) return;
    if (available === 1) {
      this.setItemQuantity(item.id, 0);
      return;
    }
    this.removalRequest.set({ item, available, quantity: 1 });
  }

  setRemovalQuantity(value: string | number): void {
    const request = this.removalRequest();
    if (!request) return;
    const quantity = Math.min(request.available, Math.max(1, Math.floor(Number(value) || 1)));
    this.removalRequest.set({ ...request, quantity });
  }

  cancelItemRemoval(): void {
    this.removalRequest.set(null);
  }

  confirmItemRemoval(): void {
    const request = this.removalRequest();
    if (!request) return;
    this.removalRequest.set(null);
    this.setItemQuantity(request.item.id, request.available - request.quantity);
  }

  canAddAndEquip(item: EquipmentItem): boolean {
    if (this.magicWeaponOptions(item).length) return false;
    const kind = equipmentKind(item);
    if (kind === 'armor') return this.armorAllowed(item);
    if (kind === 'shield') return this.canEquipShield(item);
    if (kind !== 'weapon') return true;
    const weapon = this.effectiveWeapon(item);
    const equipped = this.equippedWeaponEntries;
    if (requiresTwoHands(weapon))
      return !this.store.draft().shieldEquipped && equipped.length === 0;
    if (this.store.draft().shieldEquipped) return equipped.length === 0;
    return equipped.length < 2 && !equipped.some((entry) => entry.equipped.hands === 2);
  }

  addAndEquipItem(item: EquipmentItem): void {
    if (!this.canAddAndEquip(item)) return;
    this.addItem(item.id, false);
    const kind = equipmentKind(item);
    if (kind === 'armor') this.selectArmor(item);
    else if (kind === 'shield') this.setShieldItem(item);
    else if (kind === 'weapon') this.equipWeapon(item);
    else if (!this.itemIsEquipped(item)) this.toggleGenericEquipment(item);
    this.feedback.success(`${item.name} aggiunto ed equipaggiato.`, 'Equipaggiamento aggiornato');
  }

  private notifyEncumbranceIncrease(
    previous: 'normal' | 'encumbered' | 'heavily-encumbered' | 'over-capacity',
  ): void {
    const derived = this.store.derived();
    const rank = {
      normal: 0,
      encumbered: 1,
      'heavily-encumbered': 2,
      'over-capacity': 3,
    } as const;
    if (rank[derived.encumbrance] <= rank[previous]) return;
    if (derived.encumbrance === 'encumbered') {
      this.feedback.warning(
        `Il peso supera ${derived.encumberedThresholdKg} kg: velocità ridotta di 3 m.`,
        'Personaggio ingombrato',
        5000,
      );
      return;
    }
    if (derived.encumbrance === 'heavily-encumbered') {
      this.feedback.error(
        `Il peso supera ${derived.heavilyEncumberedThresholdKg} kg: velocità ridotta di 6 m e svantaggio alle prove, agli attacchi e ai tiri salvezza basati su FOR, DES o COS.`,
        'Pesantemente ingombrato',
      );
      return;
    }
    this.feedback.error(
      `Il peso supera la capacità massima di ${derived.carryingCapacityKg} kg e non può essere trasportato.`,
      'Carico oltre capacità',
    );
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
    const proficiencies = [...this.store.derived().weaponProficiencies];
    if (isUnarmedStrike(weapon))
      return this.store.draft().classId === 'monk' || proficiencies.includes(weapon.id);
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
  weaponAbilityModifier(item: EquipmentItem, equipped?: EquippedWeapon) {
    const weapon = this.effectiveWeapon(item);
    const modifiers = this.store.derived().modifiers;
    if (battleSmithUsesIntelligence(this.store.draft(), weapon, equipped)) return modifiers.int;
    if (isUnarmedStrike(weapon) && this.store.draft().classId === 'monk')
      return Math.max(modifiers.str, modifiers.dex);
    return weapon.ranged
      ? modifiers.dex
      : weapon.finesse
        ? Math.max(modifiers.str, modifiers.dex)
        : modifiers.str;
  }
  weaponAttack(item: EquipmentItem, bonus = 0, equipped?: EquippedWeapon) {
    const weapon = this.effectiveWeapon(item);
    const magicBonus = this.itemMagicActive(weapon)
      ? (weapon.attackBonus ?? weaponEffectTotal(weapon, 'attack-bonus'))
      : 0;
    const value =
      this.weaponAbilityModifier(weapon, equipped) +
      (this.weaponProficient(weapon) ? this.store.derived().proficiency : 0) +
      magicBonus +
      Math.max(0, Math.min(3, bonus));
    return this.mod(value);
  }
  weaponDamage(item: EquipmentItem, bonus = 0) {
    return this.weaponDamageWithLoadout(item, 1, false, bonus);
  }
  weaponDamageWithLoadout(
    item: EquipmentItem,
    hands: 1 | 2,
    offHand: boolean,
    bonus = 0,
    equipped?: EquippedWeapon,
  ) {
    const weapon = this.effectiveWeapon(item);
    const damage = isUnarmedStrike(weapon)
      ? unarmedDamage(this.store.draft().classId, this.store.draft().level)
      : damageForHands(weapon, hands);
    if (!damage || damage === '—') return '—';
    const value =
      offHand && !hasTwoWeaponFighting(this.store.draft())
        ? 0
        : this.weaponAbilityModifier(weapon, equipped);
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
        {
          equipmentId: item.id,
          hands: requiresTwoHands(item) ? 2 : 1,
          ...(battleSmithCanUseIntelligence(this.store.draft(), item)
            ? { useIntelligence: true }
            : {}),
        },
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
  canChooseWeaponIntelligence(item: EquipmentItem) {
    return battleSmithCanUseIntelligence(this.store.draft(), this.effectiveWeapon(item));
  }
  toggleWeaponIntelligence(index: number) {
    const equippedWeapons = [...(this.store.draft().equippedWeapons ?? [])];
    const equipped = equippedWeapons[index];
    const item = this.equippedWeaponEntries.find((entry) => entry.index === index)?.item;
    if (!equipped || !item || !this.canChooseWeaponIntelligence(item)) return;
    equippedWeapons[index] = {
      ...equipped,
      useIntelligence: equipped.useIntelligence === false,
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
    const previousEncumbrance = this.store.derived().encumbrance;
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
    this.notifyEncumbranceIncrease(previousEncumbrance);
    this.homebrewEquipmentOpen.set(false);
    this.feedback.success(`${item.name} è stato creato e aggiunto allo zaino.`);
  }
  removeHomebrewEquipment(id: string) {
    const draft = this.store.draft();
    const itemName = this.homebrewEquipment.find((item) => item.id === id)?.name ?? 'Oggetto';
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
    this.feedback.info(`${itemName} rimosso dallo zaino.`, 'Oggetto rimosso');
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
  get maximumAttunedItems() {
    return attunementLimit(this.store.draft());
  }
  toggleAttunement(item: EquipmentItem) {
    if (!item.requiresAttunement) return;
    const selected = this.store.draft().attunedEquipmentIds ?? [];
    if (!selected.includes(item.id) && selected.length >= this.maximumAttunedItems) {
      this.feedback.warning(
        `Puoi entrare in sintonia con un massimo di ${this.maximumAttunedItems} oggetti.`,
      );
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
      this.feedback.warning(`Cariche insufficienti per ${label}.`);
      return;
    }
    if (cost > 0) this.changeItemCharges(item, -cost);
    this.feedback.success(`${label} attivata${cost ? `: consumate ${cost} cariche.` : '.'}`);
  }
  private itemMagicActive(item: EquipmentItem) {
    return !item.requiresAttunement || this.itemIsAttuned(item);
  }
  async exportPdf() {
    if (this.pdfExporting()) return;
    this.pdfExporting.set(true);
    this.feedback.info('Compilazione della scheda PDF in corso...', 'Esportazione PDF');
    try {
      const { CharacterSheetPdfService } = await import('../../core/character-sheet-pdf.service');
      await this.injector.get(CharacterSheetPdfService).download(this.store.draft());
      this.feedback.success('Scheda PDF compilata e scaricata.');
    } catch {
      this.feedback.error('Non è stato possibile generare la scheda PDF.');
    } finally {
      this.pdfExporting.set(false);
    }
  }
  async exportSpellCardsPdf() {
    if (this.spellCardsExporting()) return;
    this.spellCardsExporting.set(true);
    this.feedback.info('Creazione delle carte incantesimo in corso...', 'Esportazione PDF');
    try {
      const { SpellCardsPdfService } = await import('../../core/spell-cards-pdf.service');
      await this.injector.get(SpellCardsPdfService).download(this.store.draft());
      this.feedback.success('Carte incantesimo ordinate e scaricate.');
    } catch {
      this.feedback.warning('Seleziona almeno un incantesimo prima di creare le carte PDF.');
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
      this.feedback.success('Personaggio importato correttamente.');
      this.go('riepilogo');
    } catch {
      this.feedback.error('File non valido o incompatibile.');
    }
  }
  markAncestryImageLoaded(id: string): void {
    this.loadedAncestryImages.update((ids) => new Set(ids).add(id));
  }
}
