import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RoutineStateService } from '../../services/routine-state.service';
import { ElementOptionComponent } from '../element-option/element-option.component';

@Component({
  selector: 'app-element-picker',
  imports: [AsyncPipe, ElementOptionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './element-picker.component.html',
  styleUrl: './element-picker.component.scss',
})
export class ElementPickerComponent {
  routineState = inject(RoutineStateService);
}
