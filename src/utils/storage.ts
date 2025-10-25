export const STORAGE_KEYS = {
  TASKS: 'tasks',
  TASKS_DATA: 'tasksData',
  PROJECTS: 'projects',
  PROJECTS_DATA: 'projectsData',
  DOCUMENTS: 'documents',
  DOCUMENTS_DATA: 'documentsData',
  LEADS: 'leads',
  LEADS_DATA: 'leadsData',
  SALES_DATA: 'salesData',
  SALES_EMAILS: 'salesEmails',
  SERVICE_MATERIALS: 'serviceMaterials',
  REVENUE_DATA: 'revenueData',
  TEAM_MEMBERS: 'teamMembers',
  MEETINGS: 'meetings',
  MEETING_MINUTES: 'meetingMinutes',
  ACTIVITIES: 'activities',
  ACTIVITY_LOG: 'activityLog',
  PROJECT_DELIVERABLES: 'projectDeliverables'
};

export class LocalStorage {
  static set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error saving to LocalStorage for key "${key}":`, error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from LocalStorage for key "${key}":`, error);
      return null;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from LocalStorage for key "${key}":`, error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing LocalStorage:', error);
    }
  }

  static exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  static getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  static getSize(): number {
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length + key.length;
        }
      }
    }
    return totalSize;
  }

  static backup(): Record<string, any> {
    const backup: Record<string, any> = {};
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            backup[key] = JSON.parse(item);
          } catch {
            backup[key] = item;
          }
        }
      }
    }
    return backup;
  }

  static restore(backup: Record<string, any>): void {
    for (const key in backup) {
      if (backup.hasOwnProperty(key)) {
        this.set(key, backup[key]);
      }
    }
  }
}