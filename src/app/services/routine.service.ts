import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, combineLatest, merge } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { createSeedState, SLOT_COUNT } from '../data/seeds';
import { GymnasticElement } from '../models/element.model';
import { RoutineState } from '../models/routine-state.model';
import { RoutineCommand, reduceRoutine } from '../utils/routine-reducer';
import { RoutineStateService } from './routine-state.service';

const STORAGE_KEY = 'routine-state';

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private _state = inject(RoutineStateService);
  private _destroyRef = inject(DestroyRef);
  private _initialized = false;

  // User events as observables: components push, never mutate state directly.
  private readonly _selectSlot$ = new Subject<number>();
  private readonly _assignElement$ = new Subject<string>();
  private readonly _clearAll$ = new Subject<void>();

  private readonly _commands$ = merge(
    this._selectSlot$.pipe(map((index): RoutineCommand => ({ type: 'selectSlot', index }))),
    this._assignElement$.pipe(
      map((elementId): RoutineCommand => ({ type: 'assignElement', elementId })),
    ),
    this._clearAll$.pipe(map((): RoutineCommand => ({ type: 'clearAll' }))),
  );

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

  // Both queries map an already-distinct source, so map() preserves distinctness
  // and no further distinctUntilChanged is needed.
  isSlotActive$(index: number): Observable<boolean> {
    return this._state.activeSlotIndex$.pipe(map((activeSlotIndex) => activeSlotIndex === index));
  }

  isElementSelected$(elementId: string): Observable<boolean> {
    return this._state.activeElementId$.pipe(
      map((activeElementId) => activeElementId === elementId),
    );
  }

  /**
   * Single entry point, called once from AppComponent: restores the saved state,
   * then starts the command pipeline and persistence.
   */
  load(): void {
    if (this._initialized) {
      return; // guard against a second call wiring duplicate subscriptions.
    }
    this._initialized = true;

    this._state.hydrate(this._readStoredState());

    this._commands$
      .pipe(
        tap((command) => this._dispatch(command)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe();

    // Wired after hydration so the first persisted value is the loaded state, never the seed.
    combineLatest([
      this._state.categories$,
      this._state.elements$,
      this._state.slotIndexes$,
      this._state.slots$,
      this._state.activeSlotIndex$,
    ])
      .pipe(
        tap(() => this._persist()),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe();
  }

  selectSlot(index: number): void {
    this._selectSlot$.next(index);
  }

  assignElement(elementId: string): void {
    this._assignElement$.next(elementId);
  }

  clearAll(): void {
    this._clearAll$.next();
  }

  private _persist(): void {
    try {
      // Only the mutable parts are persisted; the catalog is rebuilt from seeds on load.
      const { slots, activeSlotIndex } = this._state.snapshot;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, activeSlotIndex }));
    } catch {
      // storage unavailable (e.g. private mode) — keep in-memory state
    }
  }

  /** Validates a command before it is applied; warns and returns false when invalid. */
  private _assert(command: RoutineCommand): boolean {
    if (command.type === 'selectSlot') {
      const isValidSlot = command.index >= 0 && command.index < SLOT_COUNT;
      if (!isValidSlot) {
        console.warn(`[RoutineService] Ignoring invalid slot index: ${command.index}`);
        return false;
      }
    }

    if (command.type === 'assignElement' && !this._state.getElementById(command.elementId)) {
      console.warn(`[RoutineService] Unknown element id "${command.elementId}" — ignoring.`);
      return false;
    }

    return true;
  }

  /** Runs the reducer over the current state and writes back only what changed. */
  private _dispatch(command: RoutineCommand): void {
    if (!this._assert(command)) {
      return;
    }

    const current = this._state.snapshot;
    const next = reduceRoutine(current, command);
    if (next.slots !== current.slots) {
      this._state.slots = next.slots;
    }
    if (next.activeSlotIndex !== current.activeSlotIndex) {
      this._state.activeSlotIndex = next.activeSlotIndex;
    }
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
