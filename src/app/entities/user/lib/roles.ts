export const ROLE_VALUES = ['viewer', 'editor', 'admin'] as const;
export type UserRole = (typeof ROLE_VALUES)[number];
