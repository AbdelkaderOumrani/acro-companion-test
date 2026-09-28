import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ElementPickerComponent } from './components/element-picker/element-picker.component';
import { RoutineBarComponent } from './components/routine-bar/routine-bar.component';

@Component({
  selector: 'app-root',
  imports: [RoutineBarComponent, ElementPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {}
