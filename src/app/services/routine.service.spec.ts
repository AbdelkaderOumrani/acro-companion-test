import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SEED_ELEMENTS, SLOT_COUNT } from '../data/seeds';
import { RoutineStateService } from './routine-state.service';
import { RoutineService } from './routine.service';

const STORAGE_KEY = 'routine-state';

function buildSlots(entries: Record<number, string> = {}): (string | null)[] {
  const slots: (string | null)[] = Array(SLOT_COUNT).fill(null);
  for (const [index, id] of Object.entries(entries)) {
    slots[Number(index)] = id;
  }
  return slots;
}

describe('RoutineService', () => {
  let service: RoutineService;
  let state: RoutineStateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoutineService);
    state = TestBed.inject(RoutineStateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('selectSlot', () => {
    it('sets the active slot index', () => {
      service.selectSlot(3);
      expect(state.activeSlotIndexSnapshot).toBe(3);
    });

    it('ignores negative and out-of-range indexes', () => {
      service.selectSlot(-1);
      service.selectSlot(SLOT_COUNT);

      expect(state.activeSlotIndexSnapshot).toBeNull();
    });
  });

  describe('assignElement', () => {
    it('does nothing when no slot is active', () => {
      service.assignElement('f1');

      expect(state.slotsSnapshot.every((slot) => slot === null)).toBe(true);
      expect(state.activeSlotIndexSnapshot).toBeNull();
    });

    it('fills the active slot and advances to the next one', () => {
      service.selectSlot(0);
      service.assignElement('f1');

      expect(state.slotsSnapshot[0]).toBe('f1');
      expect(state.activeSlotIndexSnapshot).toBe(1);
    });

    it('ignores ids that are not in the catalog', () => {
      service.selectSlot(0);
      service.assignElement('ghost');

      expect(state.slotsSnapshot[0]).toBeNull();
      expect(state.activeSlotIndexSnapshot).toBe(0);
    });

    it('overwrites an existing slot when reassigned', () => {
      service.selectSlot(0);
      service.assignElement('f1');
      service.selectSlot(0);
      service.assignElement('b1');

      expect(state.slotsSnapshot[0]).toBe('b1');
    });

    it('stays on the last slot instead of clearing the selection', () => {
      service.selectSlot(SLOT_COUNT - 1);
      service.assignElement('f1');

      expect(state.slotsSnapshot[SLOT_COUNT - 1]).toBe('f1');
      expect(state.activeSlotIndexSnapshot).toBe(SLOT_COUNT - 1);
    });
  });

  describe('clearAll', () => {
    it('resets all slots and the active index', () => {
      service.selectSlot(0);
      service.assignElement('f1');
      service.selectSlot(2);
      service.assignElement('b1');

      service.clearAll();

      expect(state.slotsSnapshot.every((slot) => slot === null)).toBe(true);
      expect(state.activeSlotIndexSnapshot).toBeNull();
    });
  });

  describe('derived streams', () => {
    it('slotElement$ resolves the element for a slot', async () => {
      service.selectSlot(0);
      service.assignElement('f4');

      expect((await firstValueFrom(service.slotElement$(0)))?.id).toBe('f4');
    });

    it('slotElement$ emits null for an empty slot', async () => {
      expect(await firstValueFrom(service.slotElement$(5))).toBeNull();
    });

    it('slotElement$ does not emit for untouched slots', () => {
      service.selectSlot(0);
      const emissions: (string | null)[] = [];
      const subscription = service
        .slotElement$(1)
        .subscribe((element) => emissions.push(element?.id ?? null));

      service.assignElement('f1');

      subscription.unsubscribe();
      expect(emissions).toEqual([null]);
    });

    it('isSlotActive$ is true only for the active slot', async () => {
      service.selectSlot(2);

      expect(await firstValueFrom(service.isSlotActive$(2))).toBe(true);
      expect(await firstValueFrom(service.isSlotActive$(1))).toBe(false);
    });

    it('isElementSelected$ is true only for the active slot content', async () => {
      service.selectSlot(0);
      service.assignElement('f1');
      expect(await firstValueFrom(service.isElementSelected$('f1'))).toBe(false);

      service.selectSlot(0);
      expect(await firstValueFrom(service.isElementSelected$('f1'))).toBe(true);
    });

    it('totalValue$ sums the assigned element values', async () => {
      service.selectSlot(0);
      service.assignElement('f1');
      service.assignElement('b2');

      expect(await firstValueFrom(state.totalValue$)).toBeCloseTo(1.4);
    });
  });

  describe('load', () => {
    it('restores slots and the active index from storage', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slots: buildSlots({ 0: 'f1' }), activeSlotIndex: 0 }),
      );

      service.load();

      expect(state.slotsSnapshot[0]).toBe('f1');
      expect(state.activeSlotIndexSnapshot).toBe(0);
    });

    it('drops unknown element ids from stored slots', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slots: buildSlots({ 0: 'f1', 1: 'ghost' }), activeSlotIndex: 0 }),
      );

      service.load();

      expect(state.slotsSnapshot[0]).toBe('f1');
      expect(state.slotsSnapshot[1]).toBeNull();
    });

    it('falls back to the seed state for corrupt json', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      service.load();

      expect(state.slotsSnapshot.every((slot) => slot === null)).toBe(true);
      expect(state.activeSlotIndexSnapshot).toBeNull();
    });

    it('falls back when the stored slot count is wrong', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots: [null], activeSlotIndex: 0 }));

      service.load();

      expect(state.slotsSnapshot).toHaveLength(SLOT_COUNT);
      expect(state.activeSlotIndexSnapshot).toBeNull();
    });

    it('nulls an out-of-range active index but keeps valid slots', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slots: buildSlots({ 0: 'f1' }), activeSlotIndex: 99 }),
      );

      service.load();

      expect(state.activeSlotIndexSnapshot).toBeNull();
      expect(state.slotsSnapshot[0]).toBe('f1');
    });

    it('uses the seed catalog regardless of the stored catalog', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          categories: [],
          elements: [],
          slotIndexes: [],
          slots: buildSlots(),
          activeSlotIndex: null,
        }),
      );

      service.load();

      expect(state.elementsSnapshot).toEqual(SEED_ELEMENTS);
    });
  });

  describe('persistence', () => {
    it('does not write to storage before load is called', () => {
      service.selectSlot(0);

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('persists the sanitized state right after load', () => {
      service.load();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.slots).toHaveLength(SLOT_COUNT);
      expect(stored.activeSlotIndex).toBeNull();
    });

    it('persists after each state change', () => {
      service.load();
      service.selectSlot(0);
      service.assignElement('f1');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.slots[0]).toBe('f1');
      expect(stored.activeSlotIndex).toBe(1);
    });

    it('persists only the mutable state, not the seed catalog', () => {
      service.load();
      service.selectSlot(0);
      service.assignElement('f1');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(Object.keys(stored).sort()).toEqual(['activeSlotIndex', 'slots']);
    });

    it('restores what was persisted on the next load', () => {
      service.load();
      service.selectSlot(0);
      service.assignElement('f1');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const reloaded = TestBed.inject(RoutineService);
      const reloadedState = TestBed.inject(RoutineStateService);
      reloaded.load();

      expect(reloadedState.slotsSnapshot[0]).toBe('f1');
      expect(reloadedState.activeSlotIndexSnapshot).toBe(1);
    });
  });
});
