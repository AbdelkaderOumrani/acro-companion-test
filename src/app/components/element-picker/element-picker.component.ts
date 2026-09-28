import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RoutineStore } from '../../services/routine.store';
import { ElementOptionComponent } from '../element-option/element-option.component';

@Component({
  selector: 'app-element-picker',
  imports: [ElementOptionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './element-picker.component.html',
  styleUrl: './element-picker.component.scss',
})
export class ElementPickerComponent {
  private _store = inject(RoutineStore);

  activeSlotIndex = this._store.activeSlotIndex;
  groupedElements = this._store.groupedElements;
}
