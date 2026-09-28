import { TestBed } from '@angular/core/testing';
import { SEED_ELEMENTS, SLOT_COUNT } from '../data/seeds';
import { RoutineStore } from './routine.store';

const STORAGE_KEY = 'routine-state';

function buildSlots(entries: Record<number, string> = {}): (string | null)[] {
  const slots: (string | null)[] = Array(SLOT_COUNT).fill(null);
  for (const [index, id] of Object.entries(entries)) {
    slots[Number(index)] = id;
  }
  return slots;
}

describe('RoutineStore', () => {
  function createStore(): InstanceType<typeof RoutineStore> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(RoutineStore);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts with empty slots, no active slot and the seed catalog', () => {
      const store = createStore();

      expect(store.slots()).toHaveLength(SLOT_COUNT);
      expect(store.slots().every((slot) => slot === null)).toBe(true);
      expect(store.activeSlotIndex()).toBeNull();
      expect(store.elements()).toEqual(SEED_ELEMENTS);
    });
  });

  describe('selectSlot', () => {
    it('sets the active slot', () => {
      const store = createStore();
      store.selectSlot(2);
      expect(store.activeSlotIndex()).toBe(2);
    });

    it('ignores out-of-range indexes', () => {
      const store = createStore();
      store.selectSlot(-1);
      store.selectSlot(SLOT_COUNT);
      expect(store.activeSlotIndex()).toBeNull();
    });
  });

  describe('assignElement', () => {
    it('fills the active slot and advances to the next one', () => {
      const store = createStore();
      store.selectSlot(0);
      store.assignElement('f1');

      expect(store.slots()[0]).toBe('f1');
      expect(store.activeSlotIndex()).toBe(1);
    });

    it('is a no-op when no slot is active', () => {
      const store = createStore();
      store.assignElement('f1');
      expect(store.slots().every((slot) => slot === null)).toBe(true);
    });

    it('is a no-op for an unknown element id', () => {
      const store = createStore();
      store.selectSlot(0);
      store.assignElement('ghost');

      expect(store.slots()[0]).toBeNull();
      expect(store.activeSlotIndex()).toBe(0);
    });

    it('stays on the last slot', () => {
      const store = createStore();
      store.selectSlot(SLOT_COUNT - 1);
      store.assignElement('f1');

      expect(store.slots()[SLOT_COUNT - 1]).toBe('f1');
      expect(store.activeSlotIndex()).toBe(SLOT_COUNT - 1);
    });
  });

  describe('clearAll', () => {
    it('resets slots and the active index', () => {
      const store = createStore();
      store.selectSlot(0);
      store.assignElement('f1');
      store.clearAll();

      expect(store.slots().every((slot) => slot === null)).toBe(true);
      expect(store.activeSlotIndex()).toBeNull();
    });
  });

  describe('computed', () => {
    it('totalValue sums the assigned element values', () => {
      const store = createStore();
      store.selectSlot(0);
      store.assignElement('f1');
      store.assignElement('b2');

      expect(store.totalValue()).toBeCloseTo(1.4);
    });

    it('activeElementId tracks the active slot content', () => {
      const store = createStore();
      store.selectSlot(0);
      store.assignElement('f1');
      expect(store.activeElementId()).toBeNull();

      store.selectSlot(0);
      expect(store.activeElementId()).toBe('f1');
    });

    it('groupedElements groups every element under its category', () => {
      const store = createStore();
      const groups = store.groupedElements();

      expect(groups.map((group) => group.category.id)).toEqual(['front', 'back', 'other']);
      expect(groups.flatMap((group) => group.elements)).toHaveLength(SEED_ELEMENTS.length);
    });
  });

  describe('persistence', () => {
    it('persists every change, writing only the mutable parts', () => {
      const store = createStore();
      store.selectSlot(0);
      store.assignElement('f1');
      TestBed.tick();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.slots[0]).toBe('f1');
      expect(stored.activeSlotIndex).toBe(1);
      expect(Object.keys(stored).sort()).toEqual(['activeSlotIndex', 'slots']);
    });

    it('restores the persisted slots and active index on init', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slots: buildSlots({ 0: 'f1' }), activeSlotIndex: 0 }),
      );

      const store = createStore();

      expect(store.slots()[0]).toBe('f1');
      expect(store.activeSlotIndex()).toBe(0);
    });

    it('drops unknown ids and an out-of-range active index from storage', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slots: buildSlots({ 0: 'f1', 1: 'ghost' }), activeSlotIndex: 99 }),
      );

      const store = createStore();

      expect(store.slots()[0]).toBe('f1');
      expect(store.slots()[1]).toBeNull();
      expect(store.activeSlotIndex()).toBeNull();
    });

    it('falls back to the seed state for corrupt json', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const store = createStore();

      expect(store.slots().every((slot) => slot === null)).toBe(true);
      expect(store.activeSlotIndex()).toBeNull();
    });
  });
});
