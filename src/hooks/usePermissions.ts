import { useData } from '../context/DataContext';
import type { Initiative } from '../types';

const normalizeEmail = (value?: string | null): string =>
  (value || '').trim().toLowerCase();

export function usePermissions() {
  const { currentUser, userRole } = useData();
  const currentEmail = normalizeEmail(currentUser?.mail);

  const isElevated = userRole === 'Manager' || userRole === 'Admin';

  return {
    role: userRole,
    isAdmin: userRole === 'Admin',
    isManager: userRole === 'Manager',
    canEdit: (initiative: Initiative) =>
      isElevated || normalizeEmail(initiative.createdByEmail) === currentEmail,
    canDelete: (initiative: Initiative) =>
      isElevated || normalizeEmail(initiative.createdByEmail) === currentEmail,
    canManageUsers: userRole === 'Admin',
  };
}
