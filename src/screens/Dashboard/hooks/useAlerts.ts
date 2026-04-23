import { useMemo } from 'react';
import type { Initiative } from '../../../types';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: 'overdue' | 'budget' | 'unassigned' | 'delayed' | 'upcoming';
  title: string;
  description?: string;
  actionLabel?: string;
  actionHandler?: () => void;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

export function useAlerts(initiatives: Initiative[]): Alert[] {
  return useMemo(() => {
    const alerts: Alert[] = [];
    const today = new Date();

    initiatives.forEach(initiative => {
      // Check for overdue initiatives
      if (initiative.status === 'Delayed') {
        const logDate = new Date(initiative.logDate);
        const daysOverdue = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue > 0) {
          alerts.push({
            id: `overdue-${initiative.id}`,
            severity: daysOverdue > 5 ? 'critical' : 'warning',
            type: 'delayed',
            title: `${initiative.name} is ${daysOverdue} days delayed`,
            description: `Status: ${initiative.status}`,
          });
        }
      }

      // Check for unassigned initiatives
      if (!initiative.owner) {
        alerts.push({
          id: `unassigned-${initiative.id}`,
          severity: 'warning',
          type: 'unassigned',
          title: `${initiative.name}: Owner not assigned`,
          description: 'This initiative needs an owner for accountability.',
        });
      }

      // Check for budget concerns (simplified)
      if (initiative.status === 'Active') {
        const hasBudget = initiative.budget && initiative.budget.length > 0;
        if (!hasBudget) {
          alerts.push({
            id: `budget-${initiative.id}`,
            severity: 'info',
            type: 'budget',
            title: `${initiative.name}: No budget specified`,
            description: 'Consider setting a budget for this initiative.',
          });
        }
      }
    });

    // Sort by severity
    return alerts.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
  }, [initiatives]);
}
