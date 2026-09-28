import { Category } from './category.model';
import { GymnasticElement } from './element.model';

export interface RoutineState {
  categories: Category[];
  elements: GymnasticElement[];
  slotIndexes: number[];
  slots: (string | null)[];
  activeSlotIndex: number | null;
}
