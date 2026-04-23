import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useState } from 'react';
import type { Alert } from '../hooks/useAlerts';
import styles from '../../Dashboard.module.css';

interface AlertBannerProps {
  alerts: Alert[];
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  const critical = alerts.filter(a => a.severity === 'critical');
  const warning = alerts.filter(a => a.severity === 'warning');
  const info = alerts.filter(a => a.severity === 'info');

  const highestSeverity = critical.length > 0 ? 'critical' : warning.length > 0 ? 'warning' : 'info';
  const bgClass = `banner${highestSeverity.charAt(0).toUpperCase() + highestSeverity.slice(1)}`;

  return (
    <AnimatePresence>
      <motion.div
        className={`${styles.alertBanner} ${styles[bgClass]}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.alertBannerContent}>
          <div className={styles.alertBannerHeader}>
            <div className={styles.alertBannerIcon}>
              {highestSeverity === 'critical' && <AlertCircle size={20} />}
              {highestSeverity === 'warning' && <AlertTriangle size={20} />}
              {highestSeverity === 'info' && <Info size={20} />}
            </div>

            <div className={styles.alertBannerTitle}>
              <strong>{alerts.length} Issue{alerts.length !== 1 ? 's' : ''} Require{alerts.length !== 1 ? '' : 's'} Attention</strong>
              <p>Review and take action on the items below</p>
            </div>

            <button
              className={styles.alertBannerClose}
              onClick={() => setDismissed(true)}
              type="button"
              aria-label="Dismiss alerts"
            >
              <X size={18} />
            </button>
          </div>

          {(critical.length > 0 || warning.length > 0 || info.length > 0) && (
            <div className={styles.alertBannerGroups}>
              {critical.length > 0 && (
                <div className={styles.alertGroup}>
                  <h4 className={`${styles.alertGroupTitle} ${styles.critical}`}>
                    🔴 CRITICAL ({critical.length})
                  </h4>
                  <ul className={styles.alertItems}>
                    {critical.map((alert, idx) => (
                      <AlertItem key={alert.id} alert={alert} index={idx} severity="critical" />
                    ))}
                  </ul>
                </div>
              )}

              {warning.length > 0 && (
                <div className={styles.alertGroup}>
                  <h4 className={`${styles.alertGroupTitle} ${styles.warning}`}>
                    🟡 WARNING ({warning.length})
                  </h4>
                  <ul className={styles.alertItems}>
                    {warning.map((alert, idx) => (
                      <AlertItem key={alert.id} alert={alert} index={idx} severity="warning" />
                    ))}
                  </ul>
                </div>
              )}

              {info.length > 0 && (
                <div className={styles.alertGroup}>
                  <h4 className={`${styles.alertGroupTitle} ${styles.info}`}>
                    🔵 INFO ({info.length})
                  </h4>
                  <ul className={styles.alertItems}>
                    {info.map((alert, idx) => (
                      <AlertItem key={alert.id} alert={alert} index={idx} severity="info" />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function AlertItem({ alert, index, severity }: { alert: Alert; index: number; severity: string }) {
  return (
    <motion.li
      className={styles.alertItem}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <span className={styles.alertItemIcon}>
        {severity === 'critical' && '●'}
        {severity === 'warning' && '◆'}
        {severity === 'info' && '◇'}
      </span>
      <div className={styles.alertItemContent}>
        <div className={styles.alertItemTitle}>{alert.title}</div>
        {alert.description && <div className={styles.alertItemDescription}>{alert.description}</div>}
      </div>
      {alert.actionLabel && (
        <button className={styles.alertItemAction} onClick={alert.actionHandler} type="button">
          {alert.actionLabel} →
        </button>
      )}
    </motion.li>
  );
}
