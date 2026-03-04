export type UserRole = 'operator' | 'supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedZone?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
