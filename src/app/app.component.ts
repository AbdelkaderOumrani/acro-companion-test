import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ElementPickerComponent } from './components/element-picker/element-picker.component';
import { RoutineBarComponent } from './components/routine-bar/routine-bar.component';
import { RoutineService } from './services/routine.service';

@Component({
  selector: 'app-root',
  imports: [RoutineBarComponent, ElementPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {
  private _routineService = inject(RoutineService);

  constructor() {
    this._routineService.load();
  }
}
