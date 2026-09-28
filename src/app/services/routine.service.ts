import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { SEED_SLOTS, createSeedState, SLOT_COUNT } from '../data/seeds';
import { GymnasticElement } from '../models/element.model';
import { RoutineState } from '../models/routine-state.model';
import { RoutineStateService } from './routine-state.service';

const STORAGE_KEY = 'routine-state';

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private _state = inject(RoutineStateService);
  private _destroyRef = inject(DestroyRef);
  private _persistenceStarted = false;

  slotElement$(index: number): Observable<GymnasticElement | null> {
    // slots$ emits a fresh array on every change, so without distinctUntilChanged
    // every slot would re-emit whenever any other slot changes.
    return this._state.slots$.pipe(
      map((slots) => {
        const id = slots[index];
        return id ? (this._state.getElementById(id) ?? null) : null;
      }),
      distinctUntilChanged(),
    );
  }

  isSlotActive$(index: number): Observable<boolean> {
    return this._state.activeSlotIndex$.pipe(map((activeSlotIndex) => activeSlotIndex === index));
  }

  isElementSelected$(elementId: string): Observable<boolean> {
    return this._state.activeElementId$.pipe(
      map((activeElementId) => activeElementId === elementId),
    );
  }

  load(): void {
    this._state.hydrate(this._readStoredState());
    // Persistence starts only after hydration: the state streams emit their current
    // value on subscribe, so starting it in the constructor would overwrite storage
    // before the saved state has been read.
    this._startPersistence();
  }

  selectSlot(index: number): void {
    if (index < 0 || index >= SLOT_COUNT) {
      return;
    }
    this._state.activeSlotIndex = index;
  }

  assignElement(id: string): void {
    if (this._state.getElementById(id) === undefined) {
      return;
    }
    const activeSlotIndex = this._state.activeSlotIndexSnapshot;
    if (activeSlotIndex === null) {
      return;
    }
    const slots = [...this._state.slotsSnapshot];
    slots[activeSlotIndex] = id;
    const next = activeSlotIndex + 1;
    this._state.slots = slots;
    // No slot after the last one — stay on it so the picker stays open.
    this._state.activeSlotIndex = next < SLOT_COUNT ? next : activeSlotIndex;
  }

  clearAll(): void {
    this._state.slots = [...SEED_SLOTS];
    this._state.activeSlotIndex = null;
  }

  private _startPersistence(): void {
    if (this._persistenceStarted) {
      return; // load() may be called again — keep a single subscription.
    }
    this._persistenceStarted = true;
    combineLatest([
      this._state.categories$,
      this._state.elements$,
      this._state.slotIndexes$,
      this._state.slots$,
      this._state.activeSlotIndex$,
    ])
      .pipe(
        tap(() => {
          try {
            const { slots, activeSlotIndex } = this._state.snapshot;
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, activeSlotIndex }));
          } catch {
            // storage unavailable (e.g. private mode) — keep in-memory state
          }
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe();
  }

  private _readStoredState(): RoutineState {
    const seed = createSeedState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return seed;
      }
      const parsed = JSON.parse(raw) as Partial<RoutineState>;
      if (!Array.isArray(parsed.slots) || parsed.slots.length !== SLOT_COUNT) {
        return seed;
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
        id !== null && this._state.getElementById(id) ? id : null,
      );
      return { ...seed, slots, activeSlotIndex: active };
    } catch {
      return seed;
    }
  }
}
