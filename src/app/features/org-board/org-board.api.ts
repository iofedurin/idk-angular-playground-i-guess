import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { BoardPosition } from './org-board.model';

@Injectable({ providedIn: 'root' })
export class OrgBoardApi {
  private readonly http = inject(HttpClient);

  getPositions() {
    return this.http.get<BoardPosition[]>('/api/board-positions');
  }

  createPosition(userId: string, x: number, y: number) {
    return this.http.post<BoardPosition>('/api/board-positions', { userId, x, y });
  }

  updatePosition(id: string, x: number, y: number) {
    return this.http.patch<BoardPosition>(`/api/board-positions/${id}`, { x, y });
  }

  removePosition(id: string) {
    return this.http.delete<void>(`/api/board-positions/${id}`);
  }

  bulkUpdatePositions(updates: { id: string; x: number; y: number }[]) {
    return this.http.patch<BoardPosition[]>('/api/board-positions/bulk', { updates });
  }
}
