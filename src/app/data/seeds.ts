import { Category } from '../models/category.model';
import { GymnasticElement } from '../models/element.model';
import { RoutineState } from '../models/routine-state.model';

export const SLOT_COUNT = 10;

export const SEED_SLOT_INDEXES = Array.from({ length: SLOT_COUNT }, (_, index) => index);

export const SEED_CATEGORIES: Category[] = [
  { id: 'front', label: 'Front saltos' },
  { id: 'back', label: 'Back saltos' },
  { id: 'other', label: 'Other' },
];

export const SEED_ELEMENTS: GymnasticElement[] = [
  // front (6)
  { id: 'f1', label: '·−o', value: 0.1, categoryId: 'front' },
  { id: 'f2', label: '·−<', value: 0.2, categoryId: 'front' },
  { id: 'f3', label: '.1', value: 0.4, categoryId: 'front' },
  { id: 'f4', label: '.2', value: 0.6, categoryId: 'front' },
  { id: 'f5', label: '.3', value: 0.8, categoryId: 'front' },
  { id: 'f6', label: '.4', value: 1.0, categoryId: 'front' },
  // back (5)
  { id: 'b1', label: '1./', value: 1.0, categoryId: 'back' },
  { id: 'b2', label: '2.', value: 1.3, categoryId: 'back' },
  { id: 'b3', label: '3.', value: 1.6, categoryId: 'back' },
  { id: 'b4', label: '4.', value: 1.8, categoryId: 'back' },
  { id: 'b5', label: '5.', value: 2.0, categoryId: 'back' },
  // other (4)
  { id: 'o1', label: '(', value: 0.5, categoryId: 'other' },
  { id: 'o2', label: 'H', value: 0.7, categoryId: 'other' },
  { id: 'o3', label: 'F', value: 1.1, categoryId: 'other' },
  { id: 'o4', label: '∧', value: 1.4, categoryId: 'other' },
];

export const SEED_SLOTS: (string | null)[] = Array(SLOT_COUNT).fill(null);

export function createSeedState(): RoutineState {
  return {
    // The catalog is a shared, read-only blueprint — state replaces it via the
    // services and never mutates it in place. The mutable arrays are copied.
    categories: SEED_CATEGORIES,
    elements: SEED_ELEMENTS,
    slotIndexes: [...SEED_SLOT_INDEXES],
    slots: [...SEED_SLOTS],
    activeSlotIndex: null,
  };
}
