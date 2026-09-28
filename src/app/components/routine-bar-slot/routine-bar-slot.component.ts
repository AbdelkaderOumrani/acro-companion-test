import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RoutineService } from '../../services/routine.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-routine-bar-slot',
  imports: [AsyncPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-bar-slot.component.html',
  styleUrl: './routine-bar-slot.component.scss',
})
export class RoutineBarSlotComponent {
  slotIndex = input.required<number>();

  private _routineService = inject(RoutineService);

  element$ = toObservable(this.slotIndex).pipe(
    switchMap((index) => this._routineService.slotElement$(index)),
  );
  isActive$ = toObservable(this.slotIndex).pipe(
    switchMap((index) => this._routineService.isSlotActive$(index)),
  );

  onSelect(): void {
    this._routineService.selectSlot(this.slotIndex());
  }
}
