import { motion } from 'framer-motion';
import type { HealthMetrics } from '../hooks/useHealthScore';
import styles from '../../Dashboard.module.css';

interface HealthIndicatorProps {
  metrics: HealthMetrics;
}

export function HealthIndicator({ metrics }: HealthIndicatorProps) {
  const getHealthStatus = (score: number): { label: string; color: string } => {
    if (score >= 85) return { label: 'Excellent', color: '#10b981' };
    if (score >= 70) return { label: 'Good', color: '#f59e0b' };
    return { label: 'Needs Attention', color: '#ef4444' };
  };

  const status = getHealthStatus(metrics.overall);

  const components = [
    { name: 'Timeline', value: metrics.timeline, icon: '📅' },
    { name: 'Budget', value: metrics.budget, icon: '💰' },
    { name: 'Resources', value: metrics.resource, icon: '👥' },
    { name: 'Quality', value: metrics.quality, icon: '✓' },
  ];

  return (
    <motion.div
      className={styles.healthPanel}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, duration: 0.4 }}
    >
      <div className={styles.healthHeader}>
        <div>
          <h3 className={styles.healthTitle}>Portfolio Health</h3>
          <p className={styles.healthSubtitle}>{status.label}</p>
        </div>

        <motion.div
          className={styles.healthScoreCircle}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease: 'backOut' }}
        >
          <div className={styles.healthScoreValue} style={{ color: status.color }}>
            {metrics.overall}
          </div>
          <div className={styles.healthScoreMax}>/ 100</div>
        </motion.div>
      </div>

      <div className={styles.healthBar}>
        <motion.div
          className={styles.healthBarFill}
          style={{ background: status.color }}
          initial={{ width: 0 }}
          animate={{ width: `${metrics.overall}%` }}
          transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
        />
      </div>

      <div className={styles.healthComponents}>
        {components.map((comp, idx) => (
          <motion.div
            key={comp.name}
            className={styles.healthComponent}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.48 + idx * 0.06 }}
          >
            <div className={styles.healthComponentLabel}>
              <span className={styles.healthComponentIcon}>{comp.icon}</span>
              <span>{comp.name}</span>
            </div>
            <div className={styles.healthComponentBar}>
              <motion.div
                className={styles.healthComponentFill}
                initial={{ width: 0 }}
                animate={{ width: `${comp.value}%` }}
                transition={{ delay: 0.56 + idx * 0.06, duration: 0.6 }}
                style={{ background: getHealthStatus(comp.value).color }}
              />
            </div>
            <span className={styles.healthComponentValue}>{comp.value}%</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
