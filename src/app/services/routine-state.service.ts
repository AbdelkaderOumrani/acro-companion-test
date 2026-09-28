import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { SEED_CATEGORIES, SEED_ELEMENTS, SEED_SLOTS, SEED_SLOT_INDEXES } from '../data/seeds';
import { Category } from '../models/category.model';
import { GymnasticElement } from '../models/element.model';
import { RoutineState } from '../models/routine-state.model';

interface CategoryGroup {
  category: Category;
  elements: GymnasticElement[];
}

@Injectable({ providedIn: 'root' })
export class RoutineStateService {
  private _categoriesSubject = new BehaviorSubject<Category[]>(SEED_CATEGORIES);
  private _elementsSubject = new BehaviorSubject<GymnasticElement[]>(SEED_ELEMENTS);
  private _slotIndexesSubject = new BehaviorSubject<number[]>([...SEED_SLOT_INDEXES]);
  private _slotsSubject = new BehaviorSubject<(string | null)[]>([...SEED_SLOTS]);
  private _activeSlotIndexSubject = new BehaviorSubject<number | null>(null);

  categories$ = this._categoriesSubject.asObservable();
  elements$ = this._elementsSubject.asObservable();
  slotIndexes$ = this._slotIndexesSubject.asObservable();
  slots$ = this._slotsSubject.asObservable();
  activeSlotIndex$ = this._activeSlotIndexSubject.pipe(distinctUntilChanged());

  // combineLatest emits an intermediate value while assignElement updates slots and then the active index.
  activeElementId$ = combineLatest([this._slotsSubject, this._activeSlotIndexSubject]).pipe(
    map(([slots, activeSlotIndex]) => this._resolveActiveElementId(slots, activeSlotIndex)),
    distinctUntilChanged(),
  );

  totalValue$ = combineLatest([this._slotsSubject, this._elementsSubject]).pipe(
    map(([slots, elements]) => this._calculateTotal(slots, elements)),
    distinctUntilChanged(),
  );

  groupedElements$ = combineLatest([this._categoriesSubject, this._elementsSubject]).pipe(
    map(([categories, elements]) => this._groupElements(categories, elements)),
  );

  get categoriesSnapshot(): Category[] {
    return this._categoriesSubject.value;
  }

  get elementsSnapshot(): GymnasticElement[] {
    return this._elementsSubject.value;
  }

  get slotIndexesSnapshot(): number[] {
    return this._slotIndexesSubject.value;
  }

  get slotsSnapshot(): (string | null)[] {
    return this._slotsSubject.value;
  }

  get activeSlotIndexSnapshot(): number | null {
    return this._activeSlotIndexSubject.value;
  }

  get snapshot(): RoutineState {
    return {
      categories: this.categoriesSnapshot,
      elements: this.elementsSnapshot,
      slotIndexes: this.slotIndexesSnapshot,
      slots: this.slotsSnapshot,
      activeSlotIndex: this.activeSlotIndexSnapshot,
    };
  }

  set categories(categories: Category[]) {
    this._categoriesSubject.next(categories);
  }

  set elements(elements: GymnasticElement[]) {
    this._elementsSubject.next(elements);
  }

  set slotIndexes(slotIndexes: number[]) {
    this._slotIndexesSubject.next(slotIndexes);
  }

  set slots(slots: (string | null)[]) {
    this._slotsSubject.next(slots);
  }

  set activeSlotIndex(index: number | null) {
    this._activeSlotIndexSubject.next(index);
  }

  getElementById(id: string): GymnasticElement | undefined {
    return this._elementsSubject.value.find((element) => element.id === id);
  }

  hydrate(state: RoutineState): void {
    this.categories = state.categories;
    this.elements = state.elements;
    this.slotIndexes = state.slotIndexes;
    this.slots = state.slots;
    this.activeSlotIndex = state.activeSlotIndex;
  }

  private _resolveActiveElementId(
    slots: (string | null)[],
    activeSlotIndex: number | null,
  ): string | null {
    return activeSlotIndex === null ? null : slots[activeSlotIndex];
  }

  private _calculateTotal(slots: (string | null)[], elements: GymnasticElement[]): number {
    return slots.reduce((sum, id) => {
      if (id === null) {
        return sum;
      }
      return sum + (elements.find((element) => element.id === id)?.value ?? 0);
    }, 0);
  }

  private _groupElements(categories: Category[], elements: GymnasticElement[]): CategoryGroup[] {
    return categories.map((category) => ({
      category,
      elements: elements.filter((element) => element.categoryId === category.id),
    }));
  }
}
