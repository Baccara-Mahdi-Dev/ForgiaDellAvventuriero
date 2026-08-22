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
  gameTerror,
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
  spellSlots,
} from '../../domain/rules';
import {
  damageForHands,
  hasTwoWeaponFighting,
  requiresTwoHands,
} from '../../domain/weapon-loadout';
import { WizardStore } from '../../state/wizard.store';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { CharacterSheetPdfService } from '../../core/character-sheet-pdf.service';
import { ClassProgressionComponent } from './class-progression.component';

interface GrantedSpellSource {
  key: string;
  label: string;
  fixed: { spell: Spell; minLevel: number; note?: string; unlocked: boolean }[];
  choices: SpellGrantChoice[];
}
const newHomebrewSpell = (): HomebrewSpell => ({
  id: `homebrew-${crypto.randomUUID()}`,
  name: '',
  level: 0,
  school: 'Evocazione',
  description: '',
  castingTime: 'action',
  duration: 'Istantanea',
  components: ['V', 'S'],
});
@Component({
  selector: 'app-wizard',
  imports: [FormsModule, RouterLink, NgIcon, ThemeToggleComponent, ClassProgressionComponent],
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
  readonly equipmentCategory = signal<EquipmentCategory | 'all'>('all');
  readonly spellSearch = signal('');
  readonly spellLevelFilter = signal('all');
  readonly homebrewSpellOpen = signal(false);
  readonly homebrewSpell = signal<HomebrewSpell>(newHomebrewSpell());
  readonly homebrewMaterials = signal('');
  readonly homebrewHasDamage = signal(false);
  readonly pdfExporting = signal(false);
  private sub?: { unsubscribe(): void };
  constructor(
    readonly store: WizardStore,
    private route: ActivatedRoute,
    private router: Router,
    private characterSheetPdf: CharacterSheetPdfService,
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
    return sources;
  }
  get grantedSpells() {
    const ids = new Set([
      ...this.store.fixedGrantedSpellIds(),
      ...this.store.activeGrantedSpellChoiceIds(),
    ]);
    return this.store.spells.filter((spell) => ids.has(spell.id));
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
  choiceIndexes(count: number) {
    return Array.from({ length: count }, (_, index) => index);
  }
  get visibleSpells() {
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
  get availableCantrips() {
    return this.store.availableSpells().filter((spell) => spell.level === 0).length;
  }
  get availableLeveledSpells() {
    return this.store.availableSpells().filter((spell) => spell.level > 0).length;
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
  get equipmentGroups() {
    const query = this.equipmentSearch().trim().toLocaleLowerCase('it');
    const category = this.equipmentCategory();
    const items = this.store.equipment.filter(
      (item) =>
        item.armorType !== 'shield' &&
        (category === 'all' || item.category === category) &&
        (!query ||
          item.name.toLocaleLowerCase('it').includes(query) ||
          item.group.toLocaleLowerCase('it').includes(query)),
    );
    return [...new Set(items.map((item) => item.group))].map((name) => ({
      name,
      items: items.filter((item) => item.group === name),
    }));
  }
  get inventoryRows() {
    return (this.store.draft().inventory ?? [])
      .map((entry) => ({
        entry,
        item: this.store.equipment.find((item) => item.id === entry.equipmentId),
      }))
      .filter((row): row is { entry: typeof row.entry; item: EquipmentItem } => !!row.item);
  }
  get equippedWeaponEntries() {
    return (this.store.draft().equippedWeapons ?? [])
      .map((equipped, index) => ({
        equipped,
        index,
        item: this.store.equipment.find((item) => item.id === equipped.equipmentId),
      }))
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
  get shieldAllowed() {
    const shield = this.store.equipment.find((item) => item.id === 'shield');
    return (
      !!shield &&
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
    this.store.patch({ equippedArmorId: item.id });
    this.ensureInBackpack(item.id);
  }
  setShield(equipped: boolean) {
    const shield = this.store.equipment.find((item) => item.id === 'shield');
    if (equipped && (!shield || !this.shieldAllowed)) return;
    this.store.patch({ shieldEquipped: equipped });
    if (equipped) this.ensureInBackpack('shield');
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
    if (!inventory.some((entry) => entry.equipmentId === this.store.draft().equippedArmorId))
      update.equippedArmorId = '';
    if (!inventory.some((entry) => entry.equipmentId === 'shield')) update.shieldEquipped = false;
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
  weaponProficient(item: EquipmentItem) {
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
      proficiencies.includes(item.proficiency ?? '') ||
      proficiencies.includes(item.id) ||
      (racialWeapons[this.store.draft().ancestryId] ?? []).includes(item.id)
    );
  }
  weaponAbilityModifier(item: EquipmentItem) {
    const modifiers = this.store.derived().modifiers;
    return item.ranged
      ? modifiers.dex
      : item.finesse
        ? Math.max(modifiers.str, modifiers.dex)
        : modifiers.str;
  }
  weaponAttack(item: EquipmentItem) {
    const value =
      this.weaponAbilityModifier(item) +
      (this.weaponProficient(item) ? this.store.derived().proficiency : 0);
    return this.mod(value);
  }
  weaponDamage(item: EquipmentItem) {
    return this.weaponDamageWithLoadout(item, 1, false);
  }
  weaponDamageWithLoadout(item: EquipmentItem, hands: 1 | 2, offHand: boolean) {
    const damage = damageForHands(item, hands);
    if (!damage || damage === '—') return '—';
    const value =
      offHand && !hasTwoWeaponFighting(this.store.draft()) ? 0 : this.weaponAbilityModifier(item);
    return value === 0 ? damage : `${damage}${value > 0 ? '+' : '−'}${Math.abs(value)}`;
  }
  weaponHandsLabel(equipped: EquippedWeapon) {
    return equipped.hands === 2 ? 'Due mani' : 'Una mano';
  }
  canEquipWeapon(item: EquipmentItem) {
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
