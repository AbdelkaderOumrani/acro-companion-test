import { computed, effect } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  SEED_CATEGORIES,
  SEED_ELEMENTS,
  SEED_SLOTS,
  SEED_SLOT_INDEXES,
  SLOT_COUNT,
} from '../data/seeds';
import { RoutineState } from '../models/routine-state.model';
import { RoutineCommand, reduceRoutine } from '../utils/routine-reducer';

const STORAGE_KEY = 'routine-state';

const initialState: RoutineState = {
  categories: SEED_CATEGORIES,
  elements: SEED_ELEMENTS,
  slotIndexes: [...SEED_SLOT_INDEXES],
  slots: [...SEED_SLOTS],
  activeSlotIndex: null,
};

const readStoredState = (): RoutineState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }
    const parsed = JSON.parse(raw) as Partial<RoutineState>;
    if (!Array.isArray(parsed.slots) || parsed.slots.length !== SLOT_COUNT) {
      return initialState;
    }
    const active =
      parsed.activeSlotIndex === null ||
      parsed.activeSlotIndex === undefined ||
      (Number.isInteger(parsed.activeSlotIndex) &&
        parsed.activeSlotIndex >= 0 &&
        parsed.activeSlotIndex < SLOT_COUNT)
        ? (parsed.activeSlotIndex ?? null)
        : null;
    // Catalog always comes from seeds; only restore slots, dropping unknown ids.
    const slots = parsed.slots.map((id) =>
      id !== null && SEED_ELEMENTS.some((element) => element.id === id) ? id : null,
    );
    return { ...initialState, slots, activeSlotIndex: active };
  } catch {
    return initialState;
  }
};

const persist = (slots: (string | null)[], activeSlotIndex: number | null): void => {
  try {
    // Only the mutable parts are persisted; the catalog is rebuilt from seeds on init.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, activeSlotIndex }));
  } catch {
    // storage unavailable (e.g. private mode) — keep in-memory state
  }
};

export const RoutineStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeElementId: computed(() => {
      const index = store.activeSlotIndex();
      return index === null ? null : store.slots()[index];
    }),
    totalValue: computed(() =>
      store
        .slots()
        .reduce(
          (sum, id) => sum + (id ? (store.elements().find((e) => e.id === id)?.value ?? 0) : 0),
          0,
        ),
    ),
    groupedElements: computed(() =>
      store.categories().map((category) => ({
        category,
        elements: store.elements().filter((element) => element.categoryId === category.id),
      })),
    ),
  })),
  withMethods((store) => {
    const snapshot = (): RoutineState => ({
      categories: store.categories(),
      elements: store.elements(),
      slotIndexes: store.slotIndexes(),
      slots: store.slots(),
      activeSlotIndex: store.activeSlotIndex(),
    });

    const dispatch = (command: RoutineCommand): void => {
      if (command.type === 'selectSlot') {
        const isValidSlot = command.index >= 0 && command.index < SLOT_COUNT;
        if (!isValidSlot) {
          console.warn(`[RoutineStore] Ignoring invalid slot index: ${command.index}`);
          return;
        }
      }

      if (
        command.type === 'assignElement' &&
        !store.elements().some((element) => element.id === command.elementId)
      ) {
        console.warn(`[RoutineStore] Unknown element id "${command.elementId}" — ignoring.`);
        return;
      }

      patchState(store, reduceRoutine(snapshot(), command));
    };

    return {
      selectSlot: (index: number) => dispatch({ type: 'selectSlot', index }),
      assignElement: (elementId: string) => dispatch({ type: 'assignElement', elementId }),
      clearAll: () => dispatch({ type: 'clearAll' }),
    };
  }),
  withHooks({
    onInit(store) {
      patchState(store, readStoredState());

      // Persist on every change (a command patches once, so this runs once per transition).
      effect(() => persist(store.slots(), store.activeSlotIndex()));
    },
  }),
);
