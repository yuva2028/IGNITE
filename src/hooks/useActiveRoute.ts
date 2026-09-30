import { useLocation } from 'react-router-dom';

/**
 * Returns the current active route path
 */
export function useActiveRoute(): string {
  const location = useLocation();
  return location.pathname;
}
