import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CatalogService } from '../core/catalog.service';
import { CHARACTER_REPOSITORY } from '../character/application/character.repository';
import {
  decodePersistedCharacter,
  encodePersistedCharacter,
} from '../character/data-access/character-dto';
import { CharacterFileService } from '../character/data-access/character-file.service';
import { RulesCatalog } from '../domain/catalog';
import { AbilityKey, CharacterDraft } from '../domain/models';
import { derive, pointBuyCost } from '../domain/rules';
import { normalizeClassProgression } from '../domain/class-progression';
import { AbilityMethod } from '../models/enum/ability-method';
import { createFreshCharacter, normalizeCharacterDraft } from '../character/domain/character-draft';
import {
  selectActiveGrantedSpellChoiceIds,
  selectAvailableSpells,
  selectFixedGrantedSpellIds,
} from '../character/domain/spellcasting.rules';
import {
  changeAncestry,
  changeClass,
  changeLevel,
} from '../character/domain/character-transitions';

const base = () => ({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }) as const;

@Injectable({ providedIn: 'root' })
export class WizardStore {
  private readonly catalog = inject(CatalogService);
  private readonly repository = inject(CHARACTER_REPOSITORY);
  private readonly characterFiles = inject(CharacterFileService);
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
  readonly activeGrantedSpellChoiceIds = computed(() =>
    selectActiveGrantedSpellChoiceIds(this.draft(), this.catalog.requireData()),
  );
  readonly availableSpells = computed(() =>
    selectAvailableSpells(this.draft(), this.catalog.requireData()),
  );
  readonly fixedGrantedSpellIds = computed(() =>
    selectFixedGrantedSpellIds(this.draft(), this.catalog.requireData()),
  );
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
    return [...this.catalog.requireData().equipment, ...(this.draft().homebrewEquipment ?? [])];
  }
  get rulesCatalog(): RulesCatalog {
    return { ...this.catalog.requireData(), equipment: this.equipment };
  }

  newDraft(): CharacterDraft {
    const draft = this.fresh();
    this.draft.set(draft);
    return draft;
  }
  replaceDraft(value: CharacterDraft): CharacterDraft {
    const draft = this.normalize(value);
    this.draft.set(draft);
    return draft;
  }
  async load(id: string): Promise<void> {
    const value = await this.repository.get(id);
    this.draft.set(
      value === undefined ? this.fresh(id) : this.normalize(decodePersistedCharacter(value)),
    );
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
    const spellIds = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    this.patch({
      spellIds,
      ...normalizeClassProgression({ ...this.draft(), spellIds }, this.selectedClass()),
    });
  }
  randomPoint(abilityMethod: AbilityMethod) {
    switch (abilityMethod) {
      case AbilityMethod.POINT:
        this.randomPointBuy();
        break;
      default:
        this.scramblePoints();
        break;
    }
  }
  private scramblePoints(): void {
    const scores = { ...base() } as Record<AbilityKey, number>,
      keys = Object.keys(scores) as AbilityKey[];
    for (const key of keys) {
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      rolls.sort((a, b) => a - b);
      scores[key] = rolls.slice(1).reduce((sum, roll) => sum + roll, 0);
    }
    this.patch({ abilities: scores });
  }
  private randomPointBuy(): void {
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
  resetAll(): void {
    const scores: Record<AbilityKey, number> = { ...base() } as Record<AbilityKey, number>,
      keys: AbilityKey[] = Object.keys(scores) as AbilityKey[];
    keys.forEach((k) => this.setAbility(k, 8));
  }
  exportJson(): void {
    this.characterFiles.download(this.draft());
  }
  async importJson(file: File): Promise<void> {
    const value = await this.characterFiles.read(file);
    this.draft.set(this.normalize({ ...value, id: crypto.randomUUID(), revision: 0 }));
  }
  selectAncestry(id: string): void {
    this.patch(changeAncestry(this.draft(), id));
  }
  selectClass(id: string): void {
    this.patch(changeClass(this.draft(), id));
  }
  setLevel(level: number): void {
    this.patch(changeLevel(this.draft(), this.selectedClass(), level));
  }
  private fresh(id: string = crypto.randomUUID()): CharacterDraft {
    return createFreshCharacter(this.catalog.requireData().manifest.dataVersion, id);
  }
  private normalize(value: CharacterDraft): CharacterDraft {
    const data = this.catalog.requireData();
    return normalizeCharacterDraft(value, {
      catalogVersion: data.manifest.dataVersion,
      classes: data.classes,
    });
  }
  private async persist(value: CharacterDraft): Promise<void> {
    const target = await this.repository.put(encodePersistedCharacter(value));
    this.saveState.set(target === 'primary' ? 'salvato' : 'locale');
  }
}
