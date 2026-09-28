# Routine Builder — NgRx SignalStore

A small Angular 22 app that lets you compose a gymnastics routine out of ten
boxes. This branch (`signalstore`) implements the state layer with
**NgRx SignalStore** (`@ngrx/signals`). The sibling branch, `main`, implements
the same app with **RxJS and observables** — see that branch's README for its
state flow.

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
- State accessed through **signals**; components read the store's signals directly
  (no `async` pipe).
- New control flow only (`@for`, `@if`); no `*ngFor`/`*ngIf`, no `ngClass`/`ngStyle`.
- Child components receive only an **id/index signal input** (`slotIndex`, `elementId`)
  and have **no outputs**; everything else is read from the store.
- The store is a root-provided injectable service.
- `rxjs` is not a direct dependency of this branch (it remains a peer of Angular/NgRx).

## Project structure

```
src/app/
├── models/                      Category, GymnasticElement, RoutineState
├── data/seeds.ts                categories + 15 elements + slot indexes (the catalog)
├── utils/routine-reducer.ts     pure `reduceRoutine(state, command)`
├── services/routine.store.ts    the NgRx signal store (single source of truth)
├── components/
│   ├── routine-bar/             slots + D-score + Clear all
│   ├── routine-bar-slot/        a single box (input: slotIndex)
│   ├── element-picker/          grouped option selector
│   └── element-option/          a single option (input: elementId)
└── app.component.ts             shell
```

## State flow (this branch — NgRx SignalStore)

The whole state layer is a single `RoutineStore` created with `signalStore`:

```ts
export const RoutineStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),      // categories, elements, slotIndexes, slots, activeSlotIndex
  withComputed(...),            // activeElementId, totalValue, groupedElements
  withMethods(...),             // selectSlot, assignElement, clearAll
  withHooks({ onInit }),        // restore from localStorage, then persist via effect
);
```

- **`withState`** — the catalog (`categories`, `elements`, `slotIndexes`) plus the
  mutable `slots` and `activeSlotIndex`.
- **`withComputed`** — derived signals: `activeElementId`, `totalValue`,
  `groupedElements`.
- **`withMethods`** — the three actions. Each one asserts the input (slot range /
  element exists), runs the **pure `reduceRoutine(snapshot, command)`**, and applies
  the result with a **single `patchState`** (so one state transition = one write):
  ```
  click box    ─► store.selectSlot(index)
  click option ─► store.assignElement(id)
  clear button ─► store.clearAll()
                       │
                       ▼
          assert → reduceRoutine(snapshot, command) → patchState(...)
                                                       │
                                          store signals update
                                            ├─► components (read signals directly)
                                            └─► effect → localStorage
  ```
- **`withHooks.onInit`** — restores from `localStorage` (dropping unknown element
  ids and validating the active index), then registers an **`effect`** that persists
  only the mutable parts (`{ slots, activeSlotIndex }`) on every change. The catalog
  is always rebuilt from `seeds.ts`.

**Components** inject `RoutineStore` and consume its signals directly
(`store.slots()`, `store.activeElementId()`, `store.totalValue()`,
`store.groupedElements()`, …). The slot and option components derive their own
local `computed` signals (the element for a slot, whether an option is selected)
from the store's state.

## Getting started

```bash
npm install
npm start        # ng serve → http://localhost:4200
npm test         # Vitest unit tests
npm run build    # production build
```
