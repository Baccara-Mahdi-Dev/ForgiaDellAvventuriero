import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EquipmentItem } from '../../domain/models';

@Component({
  selector: 'app-magic-weapon-base-dialog',
  imports: [FormsModule],
  templateUrl: './magic-weapon-base-dialog.component.html',
  styleUrl: './magic-weapon-base-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class MagicWeaponBaseDialogComponent {
  @Input({ required: true }) item!: EquipmentItem;
  @Input({ required: true }) options: readonly EquipmentItem[] = [];
  @Input() selectedId = '';
  @Output() readonly selected = new EventEmitter<string>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly search = signal('');

  get filteredOptions() {
    const query = this.search().trim().toLocaleLowerCase('it');
    return this.options.filter(
      (option) =>
        !query ||
        option.name.toLocaleLowerCase('it').includes(query) ||
        option.group.toLocaleLowerCase('it').includes(query),
    );
  }
}
