import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, ClipboardList, History, House, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { TabId } from '../types';
import dewaLogo from '../assets/DEWA_LOGO.jpg';
import styles from './Sidebar.module.css';

interface SidebarProps {
  active: TabId;
  expanded: boolean;
  onNavigate: (id: TabId) => void;
  onBackdrop: () => void;
  isMobile: boolean;
}

const ITEMS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'initiatives', label: 'Initiatives', icon: ClipboardList },
  { id: 'audit-logs', label: 'Audit Logs', icon: History },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
];

export function Sidebar({ active, expanded, onNavigate, onBackdrop, isMobile }: SidebarProps) {
  const { initiatives, auditLogs, owners } = useData();

  const counts: Record<TabId, string> = {
    home: `${initiatives.length}`,
    initiatives: `${initiatives.length}`,
    'audit-logs': `${auditLogs.length}`,
    dashboard: `${owners.length}`,
  };

  return (
    <>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onBackdrop}
          />
        )}
      </AnimatePresence>

      <aside
        className={`${styles.sidebar} ${expanded ? styles.expanded : styles.collapsed} ${isMobile ? styles.mobile : ''}`}
        aria-label="Primary navigation"
      >
        <div className={styles.topBlock}>
          <div className={styles.brandBlock}>
            {expanded && (
              <motion.img
                src={dewaLogo}
                alt="DEWA Logo"
                className={styles.dewaLogo}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
            {!expanded && (
              <div className={styles.brandIcon}>
                <span>SAP</span>
              </div>
            )}
          </div>
        </div>

        <nav className={styles.nav}>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={() => onNavigate(item.id)}
                title={item.label}
                aria-label={item.label}
                data-collapsed={!expanded}
              >
                <span className={styles.navIcon}>
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                </span>
                {expanded && <span className={styles.navLabel}>{item.label}</span>}
                {!expanded && !isMobile && <span className={styles.tooltip}>{item.label}</span>}
                {expanded && <span className={styles.navCount}>{counts[item.id]}</span>}
                {isActive && <span className={styles.navIndicator} />}
              </button>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.footerIndicator}>
            {expanded ? <PanelLeftClose size={18} strokeWidth={2} /> : <PanelLeftOpen size={18} strokeWidth={2} />}
          </div>
          {expanded && (
            <div className={styles.footerMeta}>
              <span className={styles.footerTitle}>Navigation</span>
              <span className={styles.footerText}>Collapse or expand from the header menu</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
