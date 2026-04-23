import { useMemo } from 'react';
import type { Initiative, Status } from '../../../types';

export interface DashboardMetrics {
  total: number;
  active: number;
  pending: number;
  delayed: number;
  completed: number;

  thisMonthCreated: number;
  thisMonthCompleted: number;

  activeCategories: number;
  owners: number;

  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;

  // Trends
  activeChange: { value: number; percentage: number; isPositive: boolean };
  completedChange: { value: number; percentage: number; isPositive: boolean };
}

export function useDashboardMetrics(initiatives: Initiative[]): DashboardMetrics {
  return useMemo(() => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current counts
    const counts: Record<Status, number> = {
      Active: 0,
      Pending: 0,
      Delayed: 0,
      Completed: 0,
    };

    initiatives.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });

    // Count by severity
    const severityCounts = {
      High: initiatives.filter(i => i.severity === 'High').length,
      Medium: initiatives.filter(i => i.severity === 'Medium').length,
      Low: initiatives.filter(i => i.severity === 'Low').length,
    };

    // This month
    const thisMonthCreated = initiatives.filter(
      i => new Date(i.updatedAt) >= lastMonth
    ).length;

    const thisMonthCompleted = initiatives.filter(
      i => i.status === 'Completed' && new Date(i.updatedAt) >= lastMonth
    ).length;

    // Previous month for comparison
    const lastMonthActive = initiatives.filter(
      i => i.status === 'Active' && new Date(i.updatedAt) < lastMonth && new Date(i.updatedAt) >= twoMonthsAgo
    ).length;

    const lastMonthCompleted = initiatives.filter(
      i => i.status === 'Completed' && new Date(i.updatedAt) < lastMonth && new Date(i.updatedAt) >= twoMonthsAgo
    ).length;

    // Calculate trends
    const activeChange = calculateChange(counts.Active, lastMonthActive);
    const completedChange = calculateChange(thisMonthCompleted, lastMonthCompleted);

    // Unique counts
    const activeCategories = new Set(initiatives.map(i => i.category)).size;
    const owners = new Set(initiatives.map(i => i.owner).filter(Boolean)).size;

    return {
      total: initiatives.length,
      active: counts.Active,
      pending: counts.Pending,
      delayed: counts.Delayed,
      completed: counts.Completed,

      thisMonthCreated,
      thisMonthCompleted,

      activeCategories,
      owners,

      highSeverity: severityCounts.High,
      mediumSeverity: severityCounts.Medium,
      lowSeverity: severityCounts.Low,

      activeChange,
      completedChange,
    };
  }, [initiatives]);
}

function calculateChange(
  current: number,
  previous: number
): { value: number; percentage: number; isPositive: boolean } {
  const value = current - previous;
  const percentage = previous === 0 ? 0 : Math.round((value / previous) * 100);
  return {
    value: Math.abs(value),
    percentage: Math.abs(percentage),
    isPositive: value >= 0,
  };
}
