import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RoutineStore } from '../../services/routine.store';

@Component({
  selector: 'app-routine-bar-slot',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-bar-slot.component.html',
  styleUrl: './routine-bar-slot.component.scss',
})
export class RoutineBarSlotComponent {
  slotIndex = input.required<number>();

  private _store = inject(RoutineStore);

  element = computed(() => {
    const id = this._store.slots()[this.slotIndex()];
    return id ? (this._store.elements().find((element) => element.id === id) ?? null) : null;
  });
  isActive = computed(() => this._store.activeSlotIndex() === this.slotIndex());

  onSelect(): void {
    this._store.selectSlot(this.slotIndex());
  }
}
