# Routine Builder — RxJS / Observables

A small Angular 22 app that lets you compose a gymnastics routine out of ten
boxes. This branch (`main`) implements the state layer with **RxJS and
observables**. A second branch, `signalstore`, implements the same app with
**NgRx SignalStore** — see that branch's README for its state flow.

## The exercise

- There are **10 boxes**.
- Clicking a box opens an **option selector** with all available elements.
- Selecting an option **fills the box** and automatically makes the **next box active**.
- Clicking a box that already has a value shows that option **pre-selected** in the
  selector (and it can still be changed).
- On the **last box** the selection stays there instead of clearing.
- A **Clear all** button removes every selection and the total drops to `0`.
- **Selections survive a refresh** (persisted to `localStorage`).
- Every option has a **value**, and all selected values are **summed into a total**.

## Stack & conventions

- Angular **22** — standalone components, **zoneless**, `ChangeDetectionStrategy.OnPush`.
- New control flow only (`@for`, `@if`); no `*ngFor`/`*ngIf`, no `ngClass`/`ngStyle`.
- Child components receive only an **id/index input** (`slotIndex`, `elementId`) and
  have **no outputs**; everything else is read from the services.
- State lives in a **service**, not in a component.

## Project structure

```
src/app/
├── models/                      Category, GymnasticElement, RoutineState
├── data/seeds.ts                categories + 15 elements + slot indexes (the catalog)
├── utils/routine-reducer.ts     pure `reduceRoutine(state, command)`
├── services/
│   ├── routine-state.service.ts the single source of truth
│   └── routine.service.ts       command stream, load, persistence
├── components/
│   ├── routine-bar/             slots + D-score + Clear all
│   ├── routine-bar-slot/        a single box (input: slotIndex)
│   ├── element-picker/          grouped option selector
│   └── element-option/          a single option (input: elementId)
└── app.component.ts             shell (calls `load()`)
```

## State flow (this branch — RxJS / Observables)

Two services split **data** from **behavior**:

**`RoutineStateService` — the single source of truth**
- Holds one `BehaviorSubject` per attribute: `categories`, `elements`,
  `slotIndexes`, `slots`, `activeSlotIndex`.
- Exposes individual streams: `categories$`, `elements$`, `slotIndexes$`,
  `slots$`, `activeSlotIndex$`, plus derived `activeElementId$`, `totalValue$`
  and `groupedElements$`.
- Provides snapshot getters, class setters, and `getElementById`.

**`RoutineService` — the behavior layer (events as observables)**
1. Components push user intents onto **subjects**: `selectSlot$`,
   `assignElement$`, `clearAll$`.
2. Those are merged into a single `_commands$` stream and consumed by **one**
   subscription:
   ```
   commands$ ──tap(dispatch)──► _dispatch(command)
   ```
3. `_dispatch` asserts the command (slot range / element exists), runs the
   **pure `reduceRoutine(currentState, command)`**, and writes the changed
   attributes back to `RoutineStateService`.
4. `load()` is the **single entry point** (called once from `AppComponent`):
   - reads `localStorage`, sanitises it (drops unknown element ids, validates the
     active index), and hydrates the state;
   - starts the command pipeline;
   - starts **persistence**: a `combineLatest` of the state streams piped through
     `tap`, writing only the mutable parts (`{ slots, activeSlotIndex }`) — the
     catalog is always rebuilt from `seeds.ts`.
   - `takeUntilDestroyed` ties both subscriptions to the service lifetime.

```
click box ─► RoutineService.selectSlot(index) ─► selectSlot$.next
click option ─► RoutineService.assignElement(id) ─► assignElement$.next
clear button ─► RoutineService.clearAll() ─► clearAll$.next
                     │
                     ▼
        merge → commands$ → tap → _assert → reduceRoutine → state setters
                                                              │
                                      RoutineStateService subjects emit
                                        ├─► components (async pipe)
                                        └─► persistence tap → localStorage
```

**Components**: `RoutineBarComponent`, `RoutineBarSlotComponent`,
`ElementPickerComponent`, `ElementOptionComponent` read state through the
services and render it with the `async` pipe.

## Getting started

```bash
npm install
npm start        # ng serve → http://localhost:4200
npm test         # Vitest unit tests
npm run build    # production build
```
