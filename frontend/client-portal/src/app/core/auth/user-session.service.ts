import { Injectable } from '@angular/core';

export interface StoredUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: number;
  isActive: boolean;
}

const USER_SESSION_STORAGE_KEY = 'client-portal.auth.user';

@Injectable({ providedIn: 'root' })
export class UserSessionService {
  getUser(): StoredUserProfile | null {
    const raw = sessionStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredUserProfile;
    } catch {
      return null;
    }
  }

  setUser(user: StoredUserProfile): void {
    sessionStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(user));
  }

  clear(): void {
    sessionStorage.removeItem(USER_SESSION_STORAGE_KEY);
  }
}
