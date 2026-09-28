import { SEED_SLOTS, SLOT_COUNT } from '../data/seeds';
import { RoutineState } from '../models/routine-state.model';

/** User intents — every button/box interaction becomes one of these. */
export type RoutineCommand =
  | { type: 'selectSlot'; index: number }
  | { type: 'assignElement'; elementId: string }
  | { type: 'clearAll' };

/** Pure transition: returns the next state (or the same reference when nothing changes). */
export function reduceRoutine(state: RoutineState, command: RoutineCommand): RoutineState {
  switch (command.type) {
    case 'selectSlot': {
      const isValidIndex = command.index >= 0 && command.index < SLOT_COUNT;
      if (!isValidIndex || state.activeSlotIndex === command.index) {
        return state;
      }
      return { ...state, activeSlotIndex: command.index };
    }
    case 'assignElement': {
      const { activeSlotIndex } = state;
      const elementExists = state.elements.some((element) => element.id === command.elementId);
      if (activeSlotIndex === null || !elementExists) {
        return state;
      }
      const slots = [...state.slots];
      slots[activeSlotIndex] = command.elementId;
      const next = activeSlotIndex + 1;
      // No slot after the last one — stay on it so the picker stays open.
      return { ...state, slots, activeSlotIndex: next < SLOT_COUNT ? next : activeSlotIndex };
    }
    case 'clearAll':
      return { ...state, slots: [...SEED_SLOTS], activeSlotIndex: null };
  }
}
