import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../utils/permissions';
import type { Permission } from '../utils/permissions';

export const useRoutePermissions = () => {
  const { user } = useAuthStore();
  const permissions = usePermissions(user);

  return {
    ...permissions,
    canAccessRoute: (requiredPermissions: Permission[], requireAll = false) => {
      if (!user || !user.isApproved) return false;

      return requireAll
        ? permissions.hasAllPermissions(requiredPermissions)
        : permissions.hasAnyPermission(requiredPermissions);
    }
  };
};

export default useRoutePermissions;


