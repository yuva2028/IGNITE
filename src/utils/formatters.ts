import type { Severity, DataStatus } from '../types';

/**
 * Format a large number with K/M suffixes
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

/**
 * Format a large number with comma separators
 */
export function formatNumberFull(n: number): string {
  return n.toLocaleString('en-IN');
}

/**
 * Format relative time from ISO string
 */
export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Format a future ISO date as countdown
 */
export function formatCountdown(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/**
 * Format ISO datetime to readable local time
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Get Tailwind color class for severity
 */
export function getSeverityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };
  return map[severity];
}

/**
 * Get background color class for severity
 */
export function getSeverityBgColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    low: 'bg-green-400/10 border-green-400/20',
    medium: 'bg-amber-400/10 border-amber-400/20',
    high: 'bg-orange-400/10 border-orange-400/20',
    critical: 'bg-red-400/10 border-red-400/20',
  };
  return map[severity];
}

/**
 * Get hex color for severity (for charts)
 */
export function getSeverityHex(severity: Severity): string {
  const map: Record<Severity, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return map[severity];
}

/**
 * Get badge for data status
 */
export function getDataStatusLabel(status: DataStatus): string {
  const map: Record<DataStatus, string> = {
    live: 'LIVE',
    demo: 'DEMO',
    stale: 'STALE',
    updating: 'UPDATING',
  };
  return map[status];
}

/**
 * Get color for data status
 */
export function getDataStatusColor(status: DataStatus): string {
  const map: Record<DataStatus, string> = {
    live: 'text-green-400',
    demo: 'text-amber-400',
    stale: 'text-red-400',
    updating: 'text-cyan-400',
  };
  return map[status];
}

/**
 * Cyclone category to label
 */
export function getCategoryLabel(category: number): string {
  const labels: Record<number, string> = {
    1: 'Category 1 — Minimal',
    2: 'Category 2 — Moderate',
    3: 'Category 3 — Extensive',
    4: 'Category 4 — Extreme',
    5: 'Category 5 — Catastrophic',
  };
  return labels[category] ?? `Category ${category}`;
}
