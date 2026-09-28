import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SEED_ELEMENTS, SLOT_COUNT, createSeedState } from '../data/seeds';
import { reduceRoutine } from '../utils/routine-reducer';
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

describe('reduceRoutine', () => {
  it('sets the active slot', () => {
    expect(reduceRoutine(createSeedState(), { type: 'selectSlot', index: 2 }).activeSlotIndex).toBe(
      2,
    );
  });

  it('returns the same state for an out-of-range or already-active slot', () => {
    const state = createSeedState();
    expect(reduceRoutine(state, { type: 'selectSlot', index: -1 })).toBe(state);
    expect(reduceRoutine(state, { type: 'selectSlot', index: SLOT_COUNT })).toBe(state);

    const active = { ...state, activeSlotIndex: 3 };
    expect(reduceRoutine(active, { type: 'selectSlot', index: 3 })).toBe(active);
  });

  it('fills the active slot and advances to the next one', () => {
    const state = { ...createSeedState(), activeSlotIndex: 0 };

    const next = reduceRoutine(state, { type: 'assignElement', elementId: 'f1' });

    expect(next.slots[0]).toBe('f1');
    expect(next.activeSlotIndex).toBe(1);
  });

  it('overwrites an occupied slot when reassigned', () => {
    const state = { ...createSeedState(), slots: buildSlots({ 0: 'f1' }), activeSlotIndex: 0 };

    const next = reduceRoutine(state, { type: 'assignElement', elementId: 'b1' });

    expect(next.slots[0]).toBe('b1');
    expect(next.activeSlotIndex).toBe(1);
  });

  it('does not advance past the last slot', () => {
    const state = { ...createSeedState(), activeSlotIndex: SLOT_COUNT - 1 };

    const next = reduceRoutine(state, { type: 'assignElement', elementId: 'f1' });

    expect(next.slots[SLOT_COUNT - 1]).toBe('f1');
    expect(next.activeSlotIndex).toBe(SLOT_COUNT - 1);
  });

  it('ignores assignElement with no active slot', () => {
    const state = createSeedState();
    expect(reduceRoutine(state, { type: 'assignElement', elementId: 'f1' })).toBe(state);
  });

  it('ignores assignElement for an unknown element id', () => {
    const state = { ...createSeedState(), activeSlotIndex: 0 };
    expect(reduceRoutine(state, { type: 'assignElement', elementId: 'ghost' })).toBe(state);
  });

  it('clearAll empties the slots and the active index', () => {
    const state = { ...createSeedState(), slots: buildSlots({ 0: 'f1' }), activeSlotIndex: 0 };

    const next = reduceRoutine(state, { type: 'clearAll' });

    expect(next.slots.every((slot) => slot === null)).toBe(true);
    expect(next.activeSlotIndex).toBeNull();
  });
});

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

  describe('before load', () => {
    it('changes nothing and persists nothing', () => {
      service.selectSlot(0);
      service.assignElement('f1');

      expect(state.activeSlotIndexSnapshot).toBeNull();
      expect(state.slotsSnapshot.every((slot) => slot === null)).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('after load', () => {
    beforeEach(() => {
      service.load();
    });

    it('dispatches commands through the reducer into the state', () => {
      service.selectSlot(0);
      expect(state.activeSlotIndexSnapshot).toBe(0);

      service.assignElement('f1');
      expect(state.slotsSnapshot[0]).toBe('f1');
      expect(state.activeSlotIndexSnapshot).toBe(1);

      service.clearAll();
      expect(state.slotsSnapshot.every((slot) => slot === null)).toBe(true);
      expect(state.activeSlotIndexSnapshot).toBeNull();
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

    describe('persistence', () => {
      it('persists the sanitized state right after load', () => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
        expect(stored.slots).toHaveLength(SLOT_COUNT);
        expect(stored.activeSlotIndex).toBeNull();
      });

      it('persists every state change, writing only the mutable parts', () => {
        service.selectSlot(0);
        service.assignElement('f1');

        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
        expect(stored.slots[0]).toBe('f1');
        expect(stored.activeSlotIndex).toBe(1);
        expect(Object.keys(stored).sort()).toEqual(['activeSlotIndex', 'slots']);
      });

      it('restores what was persisted on the next load', () => {
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
});
