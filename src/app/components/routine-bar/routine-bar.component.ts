import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RoutineStore } from '../../services/routine.store';
import { RoutineBarSlotComponent } from '../routine-bar-slot/routine-bar-slot.component';

@Component({
  selector: 'app-routine-bar',
  imports: [DecimalPipe, RoutineBarSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-bar.component.html',
  styleUrl: './routine-bar.component.scss',
})
export class RoutineBarComponent {
  private _store = inject(RoutineStore);

  slotIndexes = this._store.slotIndexes;
  totalValue = this._store.totalValue;
  activeSlotIndex = this._store.activeSlotIndex;

  onClearAll(): void {
    this._store.clearAll();
  }
}
