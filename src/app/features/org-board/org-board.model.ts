import type { User } from '@entities/user';

export interface PendingConnection {
  managerId: string;
  subordinateId: string;
  subordinateName: string;
  currentManagerName: string;
  newManagerName: string;
}

export interface BoardPosition {
  id: string;
  userId: string;
  x: number;
  y: number;
}

/** Computed node: User + position, ready for rendering */
export interface BoardNode {
  userId: string;
  user: User;
  x: number;
  y: number;
  positionId: string;
  departmentIcon?: string;
  directReportsCount: number;
}

/** Computed edge: from manager to subordinate, both on board */
export interface BoardEdge {
  id: string;
  managerId: string;
  subordinateId: string;
  outputId: string;
  inputId: string;
}
