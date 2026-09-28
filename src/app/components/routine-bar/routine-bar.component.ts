import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RoutineService } from '../../services/routine.service';
import { RoutineBarSlotComponent } from '../routine-bar-slot/routine-bar-slot.component';
import { RoutineStateService } from '../../services/routine-state.service';

@Component({
  selector: 'app-routine-bar',
  imports: [AsyncPipe, DecimalPipe, RoutineBarSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-bar.component.html',
  styleUrl: './routine-bar.component.scss',
})
export class RoutineBarComponent {
  private _routineService = inject(RoutineService);
  routineState = inject(RoutineStateService);

  onClearAll(): void {
    this._routineService.clearAll();
  }
}
