import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  type?: string;
  icon?: ReactNode;
  children: ReactNode;
}

function variantFromType(value: string): BadgeVariant {
  const v = value.toLowerCase();
  if (['active', 'completed', 'success', 'low'].includes(v)) return 'success';
  if (['pending', 'hold', 'warning', 'medium'].includes(v)) return 'warning';
  if (['delayed', 'danger', 'blocked', 'high'].includes(v)) return 'danger';
  if (['information', 'info'].includes(v)) return 'info';
  return 'neutral';
}

export function Badge({ variant, type, icon, children }: BadgeProps) {
  const resolved: BadgeVariant = variant ?? (type ? variantFromType(type) : 'neutral');
  return (
    <span className={`${styles.badge} ${styles[resolved]}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
