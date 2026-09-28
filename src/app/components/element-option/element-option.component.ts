import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RoutineService } from '../../services/routine.service';
import { RoutineStateService } from '../../services/routine-state.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-element-option',
  imports: [AsyncPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './element-option.component.html',
  styleUrl: './element-option.component.scss',
})
export class ElementOptionComponent {
  elementId = input.required<string>();

  private _routineService = inject(RoutineService);
  private _routineState = inject(RoutineStateService);

  element = computed(() => this._routineState.getElementById(this.elementId()));

  isSelected$ = toObservable(this.elementId).pipe(
    switchMap((id) => this._routineService.isElementSelected$(id)),
  );

  onAssign(): void {
    this._routineService.assignElement(this.elementId());
  }
}
