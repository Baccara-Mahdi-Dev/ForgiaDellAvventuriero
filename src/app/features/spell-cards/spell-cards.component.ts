import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirArrowLeft,
  iconoirBookStack,
  iconoirCheckCircle,
  iconoirDownload,
  iconoirEye,
  iconoirFilter,
  iconoirPlus,
  iconoirMinus,
  iconoirSearch,
  iconoirTrash,
  iconoirXmark,
} from '@ng-icons/iconoir';
import { TuiButton, TuiCheckbox } from '@taiga-ui/core';
import { CatalogService } from '../../core/catalog.service';
import { SpellCardsPdfService } from '../../core/spell-cards-pdf.service';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { asSpell } from '../../domain/homebrew-spell';
import { HomebrewSpell, Spell } from '../../domain/models';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';

type FilterKey =
  | 'name'
  | 'description'
  | 'level'
  | 'class'
  | 'subclass'
  | 'concentration'
  | 'school'
  | 'ritual'
  | 'castingTime'
  | 'source';

interface ActiveFilter {
  key: FilterKey;
  label: string;
  value: string;
}

const ALL = 'Tutti';
const YES = 'Sì';
const NO = 'No';
const MANUAL_NAMES: Record<Spell['source'], string> = {
  PHB: 'Manuale del Giocatore (PHB)',
  XGE: 'Guida Omnicomprensiva di Xanathar (XGE)',
  TCE: 'Calderone Omnicomprensivo di Tasha (TCE)',
  WGE: "Guida dell'Esploratore a Eberron (WGE)",
  PSA: 'Plane Shift: Amonkhet (PSA)',
  SCAG: 'Guida degli Avventurieri alla Costa della Spada (SCAG)',
  SRD: 'System Reference Document (SRD)',
};
const SPELL_SCHOOLS = [
  'Abiurazione',
  'Ammaliamento',
  'Divinazione',
  'Evocazione',
  'Illusione',
  'Invocazione',
  'Necromanzia',
  'Trasmutazione',
] as const;
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

@Component({
  selector: 'app-spell-cards',
  imports: [FormsModule, RouterLink, NgIcon, ThemeToggleComponent, TuiButton, TuiCheckbox],
  providers: [
    provideIcons({
      iconoirArrowLeft,
      iconoirBookStack,
      iconoirCheckCircle,
      iconoirDownload,
      iconoirEye,
      iconoirFilter,
      iconoirPlus,
      iconoirMinus,
      iconoirSearch,
      iconoirTrash,
      iconoirXmark,
    }),
  ],
  templateUrl: './spell-cards.component.html',
  styleUrl: './spell-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellCardsComponent {
  private readonly catalog = inject(CatalogService);
  private readonly pdf = inject(SpellCardsPdfService);
  private readonly feedback = inject(UiFeedbackService);
  private readonly data = this.catalog.requireData();

  readonly allLabel = ALL;
  readonly yesLabel = YES;
  readonly noLabel = NO;
  readonly levels = [
    ALL,
    'Trucchetto',
    ...Array.from({ length: 9 }, (_, index) => `Livello ${index + 1}`),
  ];
  readonly classes = [...this.data.classes].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  readonly schools = [ALL, ...new Set(this.data.spells.map((spell) => spell.school))].sort(
    (a, b) => (a === ALL ? -1 : b === ALL ? 1 : a.localeCompare(b, 'it')),
  );
  readonly manuals = [...new Set(this.data.spells.map((spell) => spell.source))].sort((a, b) =>
    this.manualName(a).localeCompare(this.manualName(b), 'it'),
  );
  readonly castingTimes = [ALL, 'Azione', 'Azione bonus', 'Reazione', '1 minuto o più'];
  readonly spellSchools = SPELL_SCHOOLS;
  readonly spellLevels = Array.from({ length: 10 }, (_, level) => level);

  readonly nameFilter = signal('');
  readonly descriptionFilter = signal('');
  readonly levelFilter = signal(ALL);
  readonly classFilter = signal('');
  readonly subclassFilter = signal('');
  readonly concentrationFilter = signal(ALL);
  readonly schoolFilter = signal(ALL);
  readonly ritualFilter = signal(ALL);
  readonly castingTimeFilter = signal(ALL);
  readonly sourceFilter = signal(ALL);
  readonly page = signal(1);
  readonly viewport = signal({ width: window.innerWidth, height: window.innerHeight });
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly exporting = signal(false);
  readonly homebrewSpells = signal<HomebrewSpell[]>([]);
  readonly homebrewSpellOpen = signal(false);
  readonly homebrewSpell = signal<HomebrewSpell>(newHomebrewSpell());
  readonly homebrewMaterials = signal('');
  readonly homebrewHasDamage = signal(false);
  readonly openedSpell = signal<Spell | null>(null);
  readonly allSpells = computed(() => [...this.data.spells, ...this.homebrewSpells().map(asSpell)]);

  readonly subclasses = computed(() => {
    const classId = this.classFilter();
    return [...(this.data.subclasses ?? [])]
      .filter((subclass) => !classId || subclass.classId === classId)
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  });

  readonly filteredSpells = computed(() => {
    const name = this.normalize(this.nameFilter());
    const description = this.normalize(this.descriptionFilter());
    const level = this.levelFilter();
    const classId = this.classFilter();
    const subclassId = this.subclassFilter();
    const concentration = this.concentrationFilter();
    const school = this.schoolFilter();
    const ritual = this.ritualFilter();
    const castingTime = this.castingTimeFilter();
    const source = this.sourceFilter();

    return [...this.allSpells()]
      .filter((spell) => !name || this.normalize(spell.name).includes(name))
      .filter((spell) => !description || this.normalize(spell.description).includes(description))
      .filter((spell) => level === ALL || spell.level === this.levelValue(level))
      .filter(
        (spell) =>
          !classId ||
          spell.classes.includes(classId) ||
          (spell.subclassGrants ?? []).some((grant) => grant.classId === classId),
      )
      .filter(
        (spell) =>
          !subclassId ||
          (spell.subclassGrants ?? []).some((grant) => grant.subclassId === subclassId),
      )
      .filter(
        (spell) =>
          concentration === ALL || spell.duration.concentration === (concentration === YES),
      )
      .filter((spell) => school === ALL || spell.school === school)
      .filter((spell) => ritual === ALL || !!spell.ritual === (ritual === YES))
      .filter((spell) => castingTime === ALL || this.matchesCastingTime(spell, castingTime))
      .filter((spell) => source === ALL || (!this.isHomebrew(spell) && spell.source === source))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'it'));
  });

  readonly pageSize = computed(() => {
    const { width, height } = this.viewport();
    if (width <= 760) return height >= 850 ? 4 : 3;
    const reservedHeight = width <= 1180 ? 330 : 300;
    const rowHeight = width <= 1180 ? 150 : 145;
    const rows = Math.floor((height - reservedHeight) / rowHeight);
    return Math.max(2, Math.min(width >= 1500 ? 6 : 5, rows));
  });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredSpells().length / this.pageSize())),
  );
  readonly pageSpells = computed(() => {
    const safePage = Math.min(this.page(), this.pageCount());
    const start = (safePage - 1) * this.pageSize();
    return this.filteredSpells().slice(start, start + this.pageSize());
  });
  readonly selectedSpells = computed(() =>
    this.allSpells()
      .filter((spell) => this.selectedIds().has(spell.id))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'it')),
  );
  readonly currentPageSelectionCount = computed(
    () => this.pageSpells().filter((spell) => this.selectedIds().has(spell.id)).length,
  );
  readonly currentPageFullySelected = computed(
    () =>
      this.pageSpells().length > 0 && this.currentPageSelectionCount() === this.pageSpells().length,
  );
  readonly activeFilters = computed<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    const add = (key: FilterKey, label: string, value: string, empty = '') => {
      if (value && value !== empty && value !== ALL) filters.push({ key, label, value });
    };
    add('name', 'Nome', this.nameFilter().trim());
    add('description', 'Descrizione', this.descriptionFilter().trim());
    add('level', 'Livello', this.levelFilter(), ALL);
    add('class', 'Classe', this.className(this.classFilter()));
    add('subclass', 'Sottoclasse', this.subclassName(this.subclassFilter()));
    add('concentration', 'Concentrazione', this.concentrationFilter(), ALL);
    add('school', 'Scuola', this.schoolFilter(), ALL);
    add('ritual', 'Rituale', this.ritualFilter(), ALL);
    add('castingTime', 'Tempo di lancio', this.castingTimeFilter(), ALL);
    add(
      'source',
      'Manuale',
      this.sourceFilter() === ALL ? ALL : this.manualName(this.sourceFilter() as Spell['source']),
      ALL,
    );
    return filters;
  });
  readonly advancedFilterCount = computed(
    () =>
      this.activeFilters().filter((filter) => filter.key !== 'name' && filter.key !== 'description')
        .length,
  );

  @HostListener('document:keydown.escape')
  closeDialogs(): void {
    this.closeSpell();
    this.closeHomebrewSpellWizard();
  }

  @HostListener('window:resize')
  updateViewport(): void {
    this.viewport.set({ width: window.innerWidth, height: window.innerHeight });
    this.page.update((page) => Math.min(page, this.pageCount()));
  }

  updateFilter(target: WritableSignal<string>, value: string): void {
    target.set(value);
    this.page.set(1);
  }

  updateClass(value: string): void {
    this.classFilter.set(value);
    if (!this.subclasses().some((subclass) => subclass.id === this.subclassFilter())) {
      this.subclassFilter.set('');
    }
    this.page.set(1);
  }

  applyFilters(): void {
    this.page.set(1);
    queueMicrotask(() => document.getElementById('risultati-incantesimi')?.focus());
  }

  resetFilters(): void {
    this.nameFilter.set('');
    this.descriptionFilter.set('');
    this.levelFilter.set(ALL);
    this.classFilter.set('');
    this.subclassFilter.set('');
    this.concentrationFilter.set(ALL);
    this.schoolFilter.set(ALL);
    this.ritualFilter.set(ALL);
    this.castingTimeFilter.set(ALL);
    this.sourceFilter.set(ALL);
    this.page.set(1);
  }

  removeFilter(key: FilterKey): void {
    const signals: Record<FilterKey, WritableSignal<string>> = {
      name: this.nameFilter,
      description: this.descriptionFilter,
      level: this.levelFilter,
      class: this.classFilter,
      subclass: this.subclassFilter,
      concentration: this.concentrationFilter,
      school: this.schoolFilter,
      ritual: this.ritualFilter,
      castingTime: this.castingTimeFilter,
      source: this.sourceFilter,
    };
    signals[key].set(
      key === 'class' || key === 'subclass' || key === 'name' || key === 'description' ? '' : ALL,
    );
    if (key === 'class') this.subclassFilter.set('');
    this.page.set(1);
  }

  toggleSpell(id: string, selected: boolean): void {
    const ids = new Set(this.selectedIds());
    selected ? ids.add(id) : ids.delete(id);
    this.selectedIds.set(ids);
  }

  openSpell(spell: Spell): void {
    this.openedSpell.set(spell);
  }

  closeSpell(): void {
    this.openedSpell.set(null);
  }

  openHomebrewSpellWizard(): void {
    this.homebrewSpell.set(newHomebrewSpell());
    this.homebrewMaterials.set('');
    this.homebrewHasDamage.set(false);
    this.homebrewSpellOpen.set(true);
  }

  closeHomebrewSpellWizard(): void {
    this.homebrewSpellOpen.set(false);
  }

  patchHomebrewSpell(update: Partial<HomebrewSpell>): void {
    this.homebrewSpell.update((spell) => ({ ...spell, ...update }));
  }

  toggleHomebrewComponent(component: 'V' | 'S' | 'M', checked: boolean): void {
    const components = this.homebrewSpell().components;
    this.patchHomebrewSpell({
      components: checked
        ? [...new Set([...components, component])]
        : components.filter((item) => item !== component),
    });
  }

  saveHomebrewSpell(): void {
    const spell = this.homebrewSpell();
    if (!spell.name.trim() || !spell.description.trim()) {
      this.feedback.warning('Inserisci almeno nome e descrizione dell’incantesimo homebrew.');
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
    const saved = {
      ...spell,
      name: spell.name.trim(),
      description: spell.description.trim(),
      duration: spell.duration.trim() || 'Istantanea',
      materials,
      damage,
    };
    this.homebrewSpells.update((spells) => [...spells, saved]);
    this.toggleSpell(saved.id, true);
    this.page.set(1);
    this.closeHomebrewSpellWizard();
    this.feedback.success('Incantesimo homebrew aggiunto alle card.');
  }

  removeHomebrewSpell(id: string): void {
    this.homebrewSpells.update((spells) => spells.filter((spell) => spell.id !== id));
    this.toggleSpell(id, false);
    if (this.openedSpell()?.id === id) this.closeSpell();
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  selectCurrentPage(): void {
    const ids = new Set(this.selectedIds());
    this.pageSpells().forEach((spell) => ids.add(spell.id));
    this.selectedIds.set(ids);
  }

  deselectCurrentPage(): void {
    const ids = new Set(this.selectedIds());
    this.pageSpells().forEach((spell) => ids.delete(spell.id));
    this.selectedIds.set(ids);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  setPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
    queueMicrotask(() => document.getElementById('risultati-incantesimi')?.focus());
  }

  async exportPdf(): Promise<void> {
    if (!this.selectedSpells().length || this.exporting()) return;
    this.exporting.set(true);
    try {
      await this.pdf.downloadSpells(this.selectedSpells());
      this.feedback.success('Il PDF delle card selezionate è stato generato.', 'Card pronte');
    } catch {
      this.feedback.error(
        'Non è stato possibile generare il PDF delle card.',
        'Esportazione fallita',
      );
    } finally {
      this.exporting.set(false);
    }
  }

  classNames(spell: Spell): string {
    return spell.classes
      .map((id) => this.className(id) || id)
      .sort((a, b) => a.localeCompare(b, 'it'))
      .join(', ');
  }

  subclassGrantNames(spell: Spell): string {
    return (spell.subclassGrants ?? [])
      .map((grant) => this.subclassName(grant.subclassId) || grant.subclassId)
      .join(', ');
  }

  levelLabel(level: number): string {
    return level === 0 ? 'Trucchetto' : `Livello ${level}`;
  }

  manualName(source: Spell['source']): string {
    return MANUAL_NAMES[source];
  }

  isHomebrew(spell: Spell): boolean {
    return spell.homebrew === true;
  }

  castingTimeLabel(spell: Spell): string {
    if (spell.castingTime.text) return spell.castingTime.text;
    const units: Record<Spell['castingTime']['unit'], string> = {
      action: 'azione',
      'bonus-action': 'azione bonus',
      reaction: 'reazione',
      minute: 'minuto',
      hour: 'ora',
      special: 'speciale',
    };
    return `${spell.castingTime.amount} ${units[spell.castingTime.unit]}`;
  }

  durationLabel(spell: Spell): string {
    if (spell.duration.text) return spell.duration.text;
    if (spell.duration.unit === 'instantaneous') return 'Istantanea';
    if (spell.duration.unit === 'until-dispelled') return 'Finché non dissolto';
    if (spell.duration.unit === 'special') return 'Speciale';
    return `${spell.duration.amount ?? 1} ${spell.duration.unit}`;
  }

  private className(id: string): string {
    return this.data.classes.find((klass) => klass.id === id)?.name ?? '';
  }

  private subclassName(id: string): string {
    return (this.data.subclasses ?? []).find((subclass) => subclass.id === id)?.name ?? '';
  }

  private levelValue(label: string): number {
    return label === 'Trucchetto' ? 0 : Number(label.replace('Livello ', ''));
  }

  private matchesCastingTime(spell: Spell, filter: string): boolean {
    if (filter === 'Azione') return spell.castingTime.unit === 'action';
    if (filter === 'Azione bonus') return spell.castingTime.unit === 'bonus-action';
    if (filter === 'Reazione') return spell.castingTime.unit === 'reaction';
    return ['minute', 'hour', 'special'].includes(spell.castingTime.unit);
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('it')
      .trim();
  }
}
