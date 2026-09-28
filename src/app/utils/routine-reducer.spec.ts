import { SLOT_COUNT, createSeedState } from '../data/seeds';
import { reduceRoutine } from './routine-reducer';

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
