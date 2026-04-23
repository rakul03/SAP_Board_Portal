import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, ClipboardList, History } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { TabId } from '../types';
import styles from './Home.module.css';

interface HomeProps {
  onNavigate: (id: TabId) => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

interface Dot {
  color: string;
  value: number;
  label: string;
}

export function Home({ onNavigate }: HomeProps) {
  const { initiatives, auditLogs, currentUser } = useData();

  const total = initiatives.length;
  const active = initiatives.filter((i) => i.status === 'Active').length;
  const pending = initiatives.filter((i) => i.status === 'Pending').length;
  const delayed = initiatives.filter((i) => i.status === 'Delayed').length;
  const completed = initiatives.filter((i) => i.status === 'Completed').length;
  const highSev = auditLogs.filter((l) => l.logSeverity === 'High').length;
  const lowSev = auditLogs.filter((l) => l.logSeverity === 'Low').length;
  const activePct = total === 0 ? 0 : Math.round((active / total) * 100);
  const compliancePct = auditLogs.length === 0 ? 100 : Math.round(((auditLogs.length - highSev) / auditLogs.length) * 100);
  const greetingName = currentUser?.displayName?.trim().split(/\s+/)[0] || 'there';

  const pills = [
    { value: total, label: 'Total' },
    { value: active, label: 'Active' },
    { value: pending, label: 'Pending' },
    { value: delayed, label: 'Delayed' },
    { value: completed, label: 'Completed' },
  ];

  const cards: Array<{
    id: TabId;
    tone: 'teal' | 'amber' | 'indigo';
    category: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ size?: number }>;
    stats: Dot[];
    progress: number;
    progressLabel: string;
    action: string;
  }> = [
    {
      id: 'initiatives',
      tone: 'teal',
      category: 'Portfolio Management',
      title: 'Initiatives',
      description: 'Track and manage all strategic portfolio initiatives across categories and owners.',
      icon: ClipboardList,
      stats: [
        { color: '#10b981', value: active, label: 'Active' },
        { color: '#f59e0b', value: pending, label: 'Pending' },
        { color: '#d64545', value: delayed, label: 'Delayed' },
      ],
      progress: activePct,
      progressLabel: `${activePct}% of initiatives active`,
      action: 'Open Initiatives',
    },
    {
      id: 'audit-logs',
      tone: 'amber',
      category: 'Compliance & Security',
      title: 'Audit Logs',
      description: 'Review timeline history, follow progress, and monitor operational signals.',
      icon: History,
      stats: [
        { color: '#3b82f6', value: auditLogs.length, label: 'Total Events' },
        { color: '#d64545', value: highSev, label: 'High Severity' },
        { color: '#10b981', value: lowSev, label: 'Low/Info' },
      ],
      progress: compliancePct,
      progressLabel: `${compliancePct}% compliance health`,
      action: 'View Audit Logs',
    },
    {
      id: 'dashboard',
      tone: 'indigo',
      category: 'Analytics & Insights',
      title: 'Dashboard',
      description: 'Visualise portfolio health with KPIs, charts, and owner workload data.',
      icon: BarChart3,
      stats: [
        { color: '#14b8a6', value: total, label: 'Tracked' },
        { color: '#10b981', value: active, label: 'Active' },
        { color: '#4f46e5', value: completed, label: 'Completed' },
      ],
      progress: 99,
      progressLabel: '99% system health',
      action: 'Open Dashboard',
    },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.blobTeal} aria-hidden />
      <div className={styles.blobAmber} aria-hidden />

      <section className={styles.greeting}>
        <span className={styles.eyebrow}>Executive Overview</span>
        <h1 className={styles.title}>
          {greeting()}, {greetingName}
        </h1>
        <p className={styles.subtitle}>
          {total} portfolio initiatives under active governance.
        </p>

        <div className={styles.pills}>
          {pills.map((p) => (
            <div key={p.label} className={styles.pill}>
              <span className={styles.pillValue}>{p.value}</span>
              <span className={styles.pillLabel}>{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cards}>
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              className={`${styles.card} ${styles[card.tone]}`}
              onClick={() => onNavigate(card.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.985, y: -1 }}
            >
              <div className={styles.cardTop}>
                <div className={styles.shine} aria-hidden />
                <div className={styles.iconCircle}>
                  <Icon size={20} />
                </div>
                <div className={styles.topText}>
                  <span className={styles.category}>{card.category}</span>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                </div>
              </div>

              <div className={styles.cardBody}>
                <p className={styles.desc}>{card.description}</p>

                <div className={styles.statsRow}>
                  {card.stats.map((s) => (
                    <div key={s.label} className={styles.statChip}>
                      <span className={styles.dot} style={{ background: s.color }} />
                      <span className={styles.statValue}>{s.value}</span>
                      <span className={styles.statLabel}>{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.progressWrap}>
                  <div className={styles.progressTrack}>
                    <motion.div
                      className={styles.progressFill}
                      initial={{ width: 0 }}
                      animate={{ width: `${card.progress}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 + idx * 0.1 }}
                    />
                  </div>
                  <span className={styles.progressLabel}>{card.progressLabel}</span>
                </div>

                <div className={styles.cardFooter}>
                  <span>{card.action}</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </section>
    </div>
  );
}
