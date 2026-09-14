import { useAuthStore } from '@/store/authStore';

export function useIsAdmin() {
  return useAuthStore((state) => state.profile?.is_admin ?? false);
}
