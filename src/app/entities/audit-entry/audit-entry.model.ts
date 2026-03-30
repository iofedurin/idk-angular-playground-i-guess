export type AuditAction = 'create' | 'update' | 'delete' | 'role_change' | 'invite';
export type AuditEntityType = 'user' | 'department' | 'invitation';

export interface AuditEntry {
  id: string;
  appId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userName: string;
  timestamp: string;
  details: string;
}

export interface AuditPage {
  data: AuditEntry[];
  items: number;
  pages: number;
  first: number;
  prev: number | null;
  next: number | null;
  last: number;
}
