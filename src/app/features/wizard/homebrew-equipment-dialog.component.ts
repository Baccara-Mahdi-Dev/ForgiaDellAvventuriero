import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiNotification } from '@taiga-ui/core';
import {
  ABILITIES,
  ArmorType,
  EquipmentEffect,
  EquipmentEffectType,
  EquipmentItem,
  EquipmentKind,
  EquipmentRarity,
  Spell,
} from '../../domain/models';
import {
  EQUIPMENT_KIND_LABELS,
  EQUIPMENT_RARITY_LABELS,
  newHomebrewEquipment,
  normalizeHomebrewEquipment,
  validateHomebrewEquipment,
} from '../../domain/homebrew-equipment';

@Component({
  selector: 'app-homebrew-equipment-dialog',
  imports: [FormsModule, TuiNotification],
  templateUrl: './homebrew-equipment-dialog.component.html',
  styleUrl: './homebrew-equipment-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomebrewEquipmentDialogComponent {
  @Input({ required: true }) spells: readonly Spell[] = [];
  @Output() readonly saved = new EventEmitter<EquipmentItem>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly item = signal<EquipmentItem>(newHomebrewEquipment());
  readonly errors = signal<string[]>([]);
  readonly abilities = ABILITIES;
  readonly kindLabels = EQUIPMENT_KIND_LABELS;
  readonly rarityLabels = EQUIPMENT_RARITY_LABELS;
  readonly kinds = Object.keys(EQUIPMENT_KIND_LABELS) as EquipmentKind[];
  readonly rarities = Object.keys(EQUIPMENT_RARITY_LABELS) as EquipmentRarity[];
  readonly armorTypes: { id: Exclude<ArmorType, 'shield'>; label: string }[] = [
    { id: 'clothing', label: 'Abito' },
    { id: 'light', label: 'Leggera' },
    { id: 'medium', label: 'Media' },
    { id: 'heavy', label: 'Pesante' },
  ];
  readonly effectTypes: { id: EquipmentEffectType; label: string }[] = [
    { id: 'ability-modifier', label: 'Bonus a una caratteristica' },
    { id: 'ability-score', label: 'Imposta un punteggio minimo' },
    { id: 'armor-class', label: 'Bonus alla Classe Armatura' },
    { id: 'initiative', label: 'Bonus all’iniziativa' },
    { id: 'attack-bonus', label: 'Bonus al tiro per colpire' },
    { id: 'damage-bonus', label: 'Bonus ai danni' },
    { id: 'extra-damage', label: 'Danni aggiuntivi' },
    { id: 'skill-bonus', label: 'Bonus alle prove' },
    { id: 'saving-throw-bonus', label: 'Bonus ai tiri salvezza' },
    { id: 'resistance', label: 'Resistenza' },
    { id: 'immunity', label: 'Immunità' },
    { id: 'vulnerability', label: 'Vulnerabilità' },
    { id: 'condition', label: 'Condizione applicata' },
    { id: 'speed', label: 'Bonus alla velocità' },
    { id: 'custom', label: 'Effetto personalizzato' },
  ];

  update(update: Partial<EquipmentItem>): void {
    this.item.update((item) => ({ ...item, ...update }));
    this.errors.set([]);
  }

  rarityLabel(rarity: EquipmentRarity | undefined): string {
    return rarity ? EQUIPMENT_RARITY_LABELS[rarity] : 'Senza rarità';
  }

  splitList(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  setKind(kind: EquipmentKind): void {
    this.item.set(normalizeHomebrewEquipment({ ...this.item(), kind }));
    this.errors.set([]);
  }

  toggleMagical(magical: boolean): void {
    this.update({ magical, requiresAttunement: magical && !!this.item().requiresAttunement });
  }

  toggleCharges(enabled: boolean): void {
    this.update({
      charges: enabled
        ? (this.item().charges ?? {
            maximum: 1,
            recoveryFormula: '1',
            recoveryMoment: 'dawn',
          })
        : undefined,
    });
  }

  addEffect(): void {
    const effect: EquipmentEffect = {
      id: `effect-${crypto.randomUUID()}`,
      name: 'Nuovo effetto',
      type: 'custom',
      activation: 'passive',
      requiresEquipped: true,
    };
    this.update({ effects: [...(this.item().effects ?? []), effect] });
  }

  updateEffect(index: number, update: Partial<EquipmentEffect>): void {
    const effects = [...(this.item().effects ?? [])];
    if (!effects[index]) return;
    effects[index] = { ...effects[index], ...update };
    this.update({ effects });
  }

  removeEffect(index: number): void {
    this.update({ effects: (this.item().effects ?? []).filter((_, current) => current !== index) });
  }

  addSpell(): void {
    const first = this.spells[0];
    if (!first) return;
    this.update({
      spellGrants: [
        ...(this.item().spellGrants ?? []),
        { id: `item-spell-${crypto.randomUUID()}`, spellId: first.id, usage: 'per-day', uses: 1 },
      ],
    });
  }

  updateSpell(
    index: number,
    update: Partial<NonNullable<EquipmentItem['spellGrants']>[number]>,
  ): void {
    const spellGrants = [...(this.item().spellGrants ?? [])];
    if (!spellGrants[index]) return;
    spellGrants[index] = { ...spellGrants[index], ...update };
    this.update({ spellGrants });
  }

  removeSpell(index: number): void {
    this.update({
      spellGrants: (this.item().spellGrants ?? []).filter((_, current) => current !== index),
    });
  }

  save(): void {
    const normalized = normalizeHomebrewEquipment(this.item());
    const errors = validateHomebrewEquipment(
      normalized,
      new Set(this.spells.map((spell) => spell.id)),
    );
    this.errors.set(errors);
    if (!errors.length) this.saved.emit(normalized);
  }
}
