import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrgBoardStore } from './org-board.store';
import type { BoardPosition } from './org-board.model';

const mockPositions: BoardPosition[] = [
  { id: 'bp1', userId: 'u1', x: 100, y: 200 },
  { id: 'bp2', userId: 'u2', x: 300, y: 400 },
];

describe('OrgBoardStore', () => {
  let store: InstanceType<typeof OrgBoardStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(OrgBoardStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has empty initial state', () => {
    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  describe('loadPositions()', () => {
    it('fetches positions and populates entities', async () => {
      const promise = store.loadPositions();
      httpMock.expectOne('/api/board-positions').flush(mockPositions);
      await promise;

      expect(store.entities()).toEqual(mockPositions);
      expect(store.loading()).toBe(false);
    });

    it('skips fetch if already loaded (cache)', async () => {
      const promise = store.loadPositions();
      httpMock.expectOne('/api/board-positions').flush(mockPositions);
      await promise;

      await store.loadPositions();
      httpMock.expectNone('/api/board-positions');

      expect(store.entities()).toHaveLength(2);
    });

    it('sets error on failure', async () => {
      const promise = store.loadPositions();
      httpMock
        .expectOne('/api/board-positions')
        .flush('error', { status: 500, statusText: 'Server Error' });
      await promise;

      expect(store.error()).toBe('Failed to load board positions');
      expect(store.entities()).toEqual([]);
    });
  });

  describe('addToBoard()', () => {
    it('POSTs and adds entity to store', async () => {
      const newPos: BoardPosition = { id: 'bp3', userId: 'u3', x: 50, y: 50 };
      const promise = store.addToBoard('u3', 50, 50);
      httpMock.expectOne('/api/board-positions').flush(newPos);
      const result = await promise;

      expect(result).toEqual(newPos);
      expect(store.entities()).toContainEqual(newPos);
    });

    it('returns undefined on HTTP error', async () => {
      const promise = store.addToBoard('u3', 50, 50);
      httpMock
        .expectOne('/api/board-positions')
        .flush('error', { status: 500, statusText: 'Server Error' });
      const result = await promise;

      expect(result).toBeUndefined();
      expect(store.entities()).toEqual([]);
    });
  });

  describe('updatePosition()', () => {
    it('PATCHes and updates entity in store', async () => {
      const loadPromise = store.loadPositions();
      httpMock.expectOne('/api/board-positions').flush(mockPositions);
      await loadPromise;

      const updated: BoardPosition = { id: 'bp1', userId: 'u1', x: 999, y: 888 };
      const promise = store.updatePosition('bp1', 999, 888);
      httpMock.expectOne('/api/board-positions/bp1').flush(updated);
      const result = await promise;

      expect(result).toBe(true);
      const pos = store.entityMap()['bp1'];
      expect(pos?.x).toBe(999);
      expect(pos?.y).toBe(888);
    });

    it('returns false on HTTP error', async () => {
      const promise = store.updatePosition('bp1', 999, 888);
      httpMock
        .expectOne('/api/board-positions/bp1')
        .flush('error', { status: 500, statusText: 'Server Error' });
      const result = await promise;

      expect(result).toBe(false);
    });
  });

  describe('removeFromBoard()', () => {
    it('DELETEs and removes entity from store', async () => {
      const loadPromise = store.loadPositions();
      httpMock.expectOne('/api/board-positions').flush(mockPositions);
      await loadPromise;

      const promise = store.removeFromBoard('bp1');
      httpMock.expectOne('/api/board-positions/bp1').flush(null);
      const result = await promise;

      expect(result).toBe(true);
      expect(store.entities().map((p) => p.id)).not.toContain('bp1');
    });

    it('returns false on HTTP error', async () => {
      const promise = store.removeFromBoard('bp1');
      httpMock
        .expectOne('/api/board-positions/bp1')
        .flush('error', { status: 500, statusText: 'Server Error' });
      const result = await promise;

      expect(result).toBe(false);
    });
  });

  describe('positionByUserId', () => {
    it('maps userId → BoardPosition', async () => {
      const promise = store.loadPositions();
      httpMock.expectOne('/api/board-positions').flush(mockPositions);
      await promise;

      const map = store.positionByUserId();
      expect(map.get('u1')).toEqual(mockPositions[0]);
      expect(map.get('u2')).toEqual(mockPositions[1]);
    });
  });

  describe('reset()', () => {
    it('clears all entities and resets state', async () => {
      const promise = store.loadPositions();
      httpMock.expectOne('/api/board-positions').flush(mockPositions);
      await promise;

      expect(store.entities()).toHaveLength(2);

      store.reset();

      expect(store.entities()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });
});
