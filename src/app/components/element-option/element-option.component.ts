import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RoutineStore } from '../../services/routine.store';

@Component({
  selector: 'app-element-option',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './element-option.component.html',
  styleUrl: './element-option.component.scss',
})
export class ElementOptionComponent {
  elementId = input.required<string>();

  private _store = inject(RoutineStore);

  element = computed(
    () => this._store.elements().find((element) => element.id === this.elementId()) ?? null,
  );
  isSelected = computed(() => this._store.activeElementId() === this.elementId());

  onAssign(): void {
    this._store.assignElement(this.elementId());
  }
}
