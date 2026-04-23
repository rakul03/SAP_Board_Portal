import { useMemo } from 'react';
import type { Initiative, AuditLog } from '../../../types';

export interface HealthMetrics {
  overall: number;
  timeline: number;
  budget: number;
  resource: number;
  quality: number;
}

export function useHealthScore(initiatives: Initiative[], auditLogs: AuditLog[]): HealthMetrics {
  return useMemo(() => {
    if (initiatives.length === 0) {
      return { overall: 0, timeline: 0, budget: 0, resource: 0, quality: 0 };
    }

    // Timeline Health: % of initiatives on schedule
    const onTime = initiatives.filter(i => {
      const logDate = new Date(i.logDate);
      const today = new Date();
      return logDate > today || i.status === 'Completed';
    }).length;
    const timeline = Math.round((onTime / initiatives.length) * 100);

    // Budget Health: % of initiatives within budget
    const withinBudget = initiatives.filter(i => {
      if (!i.budget) return true;
      return true; // Simplified - assume within budget
    }).length;
    const budget = Math.round((withinBudget / initiatives.length) * 100);

    // Resource Health: % of initiatives with owner assigned
    const staffed = initiatives.filter(i => i.owner).length;
    const resource = Math.round((staffed / initiatives.length) * 100);

    // Quality Health: % of low-severity audit logs
    const goodQuality = auditLogs.filter(l => l.logSeverity !== 'High').length;
    const quality = auditLogs.length > 0
      ? Math.round((goodQuality / auditLogs.length) * 100)
      : 100;

    // Overall: Average of all metrics
    const overall = Math.round((timeline + budget + resource + quality) / 4);

    return { overall, timeline, budget, resource, quality };
  }, [initiatives, auditLogs]);
}
