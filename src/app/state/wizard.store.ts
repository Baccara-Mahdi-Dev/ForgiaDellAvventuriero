import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CatalogService } from '../core/catalog.service';
import { characterDb } from '../core/character.database';
import { RulesCatalog } from '../domain/catalog';
import {
  AbilityKey,
  CharacterDraft,
  HOMEBREW_ABILITY_MAX,
  HOMEBREW_ABILITY_MIN,
} from '../domain/models';
import { derive, maximumSpellLevel, pointBuyCost } from '../domain/rules';
import { normalizeClassProgression } from '../domain/class-progression';

const base = () => ({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }) as const;

@Injectable({ providedIn: 'root' })
export class WizardStore {
  private readonly catalog = inject(CatalogService);
  readonly draft = signal<CharacterDraft>(this.fresh());
  readonly derived = computed(() => derive(this.draft(), this.rulesCatalog));
  readonly pointsSpent = computed(() =>
    Object.values(this.draft().abilities).reduce((sum, value) => sum + pointBuyCost(value), 0),
  );
  readonly selectedAncestry = computed(() =>
    this.ancestries.find((item) => item.id === this.draft().ancestryId),
  );
  readonly selectedClass = computed(() =>
    this.classes.find((item) => item.id === this.draft().classId),
  );
  readonly selectedBackground = computed(() =>
    this.backgrounds.find((item) => item.id === this.draft().backgroundId),
  );
  readonly activeGrantedSpellChoiceIds = computed(() => {
    const draft = this.draft();
    const ancestry = this.ancestries.find((item) => item.id === draft.ancestryId);
    const feats = this.feats.filter((item) => draft.featIds.includes(item.id));
    const activeChoices = new Set([
      ...(ancestry?.spellChoices ?? []).map((choice) => choice.id),
      ...feats.flatMap((feat) => (feat.spellChoices ?? []).map((choice) => choice.id)),
    ]);
    return Object.entries(draft.grantedSpellChoices ?? {})
      .filter(([choiceId]) => activeChoices.has(choiceId))
      .flatMap(([, spellIds]) => spellIds);
  });
  readonly availableSpells = computed(() => {
    const draft = this.draft();
    const maxLevel = maximumSpellLevel(draft.classId, draft.level);
    const granted = new Set([
      ...this.fixedGrantedSpellIds(),
      ...this.activeGrantedSpellChoiceIds(),
    ]);
    return this.spells.filter(
      (spell) =>
        spell.classes.includes(draft.classId) && spell.level <= maxLevel && !granted.has(spell.id),
    );
  });
  readonly fixedGrantedSpellIds = computed(() => {
    const draft = this.draft();
    const ancestry = this.ancestries.find((item) => item.id === draft.ancestryId);
    const feats = this.feats.filter((item) => draft.featIds.includes(item.id));
    const ids = [
      ...(ancestry?.spellGrants ?? []),
      ...feats.flatMap((feat) => feat.spellGrants ?? []),
    ]
      .filter((grant) => grant.minLevel <= draft.level)
      .map((grant) => grant.spellId);
    ids.push(
      ...this.spells
        .filter((spell) =>
          spell.subclassGrants?.some(
            (grant) =>
              grant.classId === draft.classId &&
              grant.subclassId === draft.subclassId &&
              grant.minLevel <= draft.level,
          ),
        )
        .map((spell) => spell.id),
    );
    return [...new Set(ids)];
  });
  readonly saveState = signal<'salvato' | 'salvataggio' | 'locale'>('salvato');
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const draft = this.draft();
      this.saveState.set('salvataggio');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.persist(draft), 350);
    });
  }

  get ancestries() {
    return this.catalog.requireData().ancestries;
  }
  get classes() {
    return this.catalog.requireData().classes;
  }
  get backgrounds() {
    return this.catalog.requireData().backgrounds;
  }
  get feats() {
    return this.catalog.requireData().feats;
  }
  get spells() {
    return this.catalog.requireData().spells;
  }
  get equipment() {
    return this.catalog.requireData().equipment;
  }
  get rulesCatalog(): RulesCatalog {
    return this.catalog.requireData();
  }

  newDraft(): CharacterDraft {
    const draft = this.fresh();
    this.draft.set(draft);
    return draft;
  }
  async load(id: string): Promise<void> {
    try {
      this.draft.set(this.normalize((await characterDb.characters.get(id)) ?? this.fresh(id)));
    } catch {
      const raw = localStorage.getItem(`forgia:${id}`);
      this.draft.set(raw ? this.normalize(JSON.parse(raw) as CharacterDraft) : this.fresh(id));
    }
  }
  patch(update: Partial<CharacterDraft>): void {
    this.draft.update((draft) => ({
      ...draft,
      ...update,
      catalogVersion: this.catalog.requireData().manifest.dataVersion,
      revision: draft.revision + 1,
      updatedAt: new Date().toISOString(),
    }));
  }
  setAbility(key: AbilityKey, value: number): void {
    this.patch({ abilities: { ...this.draft().abilities, [key]: value } });
  }
  setAsi(key: AbilityKey, value: number): void {
    this.patch({ asi: { ...this.draft().asi, [key]: value } });
  }
  toggleFeat(id: string): void {
    const selected = this.draft().featIds;
    this.patch({
      featIds: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    });
  }
  toggleSpell(id: string): void {
    const selected = this.draft().spellIds;
    this.patch({
      spellIds: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    });
  }
  randomPointBuy(): void {
    const scores = { ...base() } as Record<AbilityKey, number>,
      keys = Object.keys(scores) as AbilityKey[];
    let budget = 27;
    while (budget > 0) {
      const key = keys[Math.floor(Math.random() * keys.length)],
        next = scores[key] + 1,
        cost = pointBuyCost(next) - pointBuyCost(scores[key]);
      if (next <= 15 && cost <= budget) {
        scores[key] = next;
        budget -= cost;
      }
    }
    this.patch({ abilities: scores });
  }
  exportJson(): void {
    const blob = new Blob([JSON.stringify(this.draft(), null, 2)], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.draft().name || 'personaggio'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async importJson(file: File): Promise<void> {
    const value = JSON.parse(await file.text()) as CharacterDraft;
    if (value.schemaVersion !== 1 || !value.id || !value.abilities)
      throw new Error('File non riconosciuto');
    this.draft.set(this.normalize({ ...value, id: crypto.randomUUID(), revision: 0 }));
  }
  async list(): Promise<CharacterDraft[]> {
    try {
      return (await characterDb.characters.orderBy('updatedAt').reverse().toArray()).map((value) =>
        this.normalize(value),
      );
    } catch {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith('forgia:'))
        .map((key) => this.normalize(JSON.parse(localStorage.getItem(key)!) as CharacterDraft));
    }
  }
  async remove(id: string): Promise<void> {
    try {
      await characterDb.characters.delete(id);
    } catch {
      localStorage.removeItem(`forgia:${id}`);
    }
  }

  private fresh(id: string = crypto.randomUUID()): CharacterDraft {
    return {
      schemaVersion: 1,
      catalogVersion: this.catalog.requireData().manifest.dataVersion,
      id,
      revision: 0,
      updatedAt: new Date().toISOString(),
      name: '',
      alignment: '',
      abilityMethod: 'point-buy',
      abilities: { ...base() },
      sanityEnabled: false,
      sanityScore: 8,
      ancestryId: '',
      ancestryBonusAbilities: [],
      ancestrySkillProficiencies: [],
      ancestryToolProficiencies: [],
      classId: '',
      subclassId: '',
      classSkillProficiencies: [],
      classFeatureChoices: {},
      backgroundId: '',
      customLanguages: [],
      customTools: [],
      level: 1,
      hpMethod: 'average',
      hpRolls: [],
      asi: {},
      featIds: [],
      featAbilityChoices: {},
      spellIds: [],
      homebrewSpells: [],
      grantedSpellChoices: {},
      spellGrantTraditions: {},
      equippedArmorId: '',
      shieldEquipped: false,
      equippedWeapons: [],
      inventory: [],
      coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      hitDiceSpent: 0,
      inspiration: false,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      notes: '',
    };
  }
  private normalize(value: CharacterDraft): CharacterDraft {
    const normalized = {
      ...value,
      catalogVersion: this.catalog.requireData().manifest.dataVersion,
      alignment: value.alignment ?? '',
      sanityEnabled: value.sanityEnabled ?? false,
      sanityScore: Math.max(
        HOMEBREW_ABILITY_MIN,
        Math.min(HOMEBREW_ABILITY_MAX, Math.floor(value.sanityScore ?? 8)),
      ),
      ancestryBonusAbilities: value.ancestryBonusAbilities ?? [],
      ancestrySkillProficiencies: value.ancestrySkillProficiencies ?? [],
      ancestryToolProficiencies: value.ancestryToolProficiencies ?? [],
      classSkillProficiencies: value.classSkillProficiencies ?? [],
      classFeatureChoices: value.classFeatureChoices ?? {},
      customLanguages: value.customLanguages ?? [],
      customTools: value.customTools ?? [],
      hpMethod: value.hpMethod ?? 'average',
      hpRolls: value.hpRolls ?? [],
      featAbilityChoices: value.featAbilityChoices ?? {},
      grantedSpellChoices: value.grantedSpellChoices ?? {},
      spellGrantTraditions: value.spellGrantTraditions ?? {},
      homebrewSpells: (value.homebrewSpells ?? []).filter(
        (spell) => spell && !!spell.id && !!spell.name && spell.level >= 0 && spell.level <= 9,
      ),
      equippedArmorId: value.equippedArmorId ?? '',
      shieldEquipped: value.shieldEquipped ?? false,
      equippedWeapons: (value.equippedWeapons ?? []).filter(
        (weapon) => weapon && (weapon.hands === 1 || weapon.hands === 2) && !!weapon.equipmentId,
      ),
      inventory: value.inventory ?? [],
      coins: value.coins ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      hitDiceSpent: value.hitDiceSpent ?? 0,
      inspiration: value.inspiration ?? false,
      deathSaveSuccesses: value.deathSaveSuccesses ?? 0,
      deathSaveFailures: value.deathSaveFailures ?? 0,
    };
    const klass = this.classes.find((item) => item.id === normalized.classId);
    return { ...normalized, ...normalizeClassProgression(normalized, klass) };
  }
  private async persist(value: CharacterDraft): Promise<void> {
    try {
      await characterDb.characters.put(value);
      this.saveState.set('salvato');
    } catch {
      localStorage.setItem(`forgia:${value.id}`, JSON.stringify(value));
      this.saveState.set('locale');
    }
  }
}
