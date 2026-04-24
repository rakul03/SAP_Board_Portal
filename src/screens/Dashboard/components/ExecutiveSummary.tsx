import { motion } from 'framer-motion';
import { ClipboardCheck, TrendingUp, AlertCircle, Users, TrendingDown } from 'lucide-react';
import type { DashboardMetrics } from '../hooks/useDashboardMetrics';
import styles from '../../Dashboard.module.css';

interface ExecutiveSummaryProps {
  metrics: DashboardMetrics;
  onDrillDown: (type: string, value: string) => void;
}

interface MetricCard {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  trend: { value: number; percentage: number; isPositive: boolean };
  color: string;
  onClick: () => void;
}

export function ExecutiveSummary({ metrics, onDrillDown }: ExecutiveSummaryProps) {
  const cards: MetricCard[] = [
    {
      icon: ClipboardCheck,
      label: 'Total Initiatives',
      value: metrics.total,
      trend: { value: 0, percentage: 0, isPositive: true },
      color: '#007564',
      onClick: () => onDrillDown('', ''),
    },
    {
      icon: TrendingUp,
      label: 'Active',
      value: metrics.active,
      trend: metrics.activeChange,
      color: '#10b981',
      onClick: () => onDrillDown('status', 'Active'),
    },
    {
      icon: AlertCircle,
      label: 'Pending Review',
      value: metrics.pending,
      trend: { value: 0, percentage: 0, isPositive: true },
      color: '#f59e0b',
      onClick: () => onDrillDown('status', 'Pending'),
    },
    {
      icon: Users,
      label: 'Portfolio Owners',
      value: metrics.owners,
      trend: { value: 0, percentage: 0, isPositive: true },
      color: '#3b82f6',
      onClick: () => {},
    },
  ];
  const maxValue = Math.max(...cards.map((card) => card.value), 1);
  const cardCaptions: Record<string, string> = {
    'Total Initiatives': 'Portfolio baseline',
    Active: 'Work currently in motion',
    'Pending Review': 'Awaiting decision',
    'Portfolio Owners': 'Assigned account holders',
  };

  return (
    <div className={styles.executiveSummary}>
      <div className={styles.summaryGridContainer}>
        {cards.map((card, idx) => (
          <ExecutiveSummaryCard
            key={card.label}
            card={card}
            index={idx}
            maxValue={maxValue}
            caption={cardCaptions[card.label]}
          />
        ))}
      </div>
    </div>
  );
}

function ExecutiveSummaryCard({
  card,
  index,
  maxValue,
  caption,
}: {
  card: MetricCard;
  index: number;
  maxValue: number;
  caption: string;
}) {
  const Icon = card.icon;
  const TrendIcon = card.trend.isPositive ? TrendingUp : TrendingDown;
  const progress = Math.min((card.value / maxValue) * 100, 100);

  return (
    <motion.button
      className={styles.summaryCard}
      style={{ ['--summary-accent' as any]: card.color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={card.onClick}
      type="button"
    >
      <div className={styles.summaryCardContent}>
        <div className={styles.summaryCardHeader}>
          <div>
            <p className={styles.summaryCardLabel}>{card.label}</p>
            <div className={styles.summaryCardValue} style={{ color: card.color }}>
              {card.value.toLocaleString()}
            </div>
            <p className={styles.summaryCardCaption}>{caption}</p>
          </div>

          <div className={styles.summaryCardIcon}>
            <Icon size={24} />
          </div>
        </div>

        {(card.trend.value > 0 || card.trend.percentage > 0) && (
          <motion.div
            className={`${styles.summaryTrend} ${card.trend.isPositive ? styles.trendUp : styles.trendDown}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 + 0.15 }}
          >
            <TrendIcon size={14} />
            <span>
              {card.trend.isPositive ? '+' : '-'}
              {card.trend.value} ({card.trend.percentage}%)
            </span>
          </motion.div>
        )}

        <div className={styles.summaryProgressBar}>
          <motion.div
            className={styles.summaryProgress}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: index * 0.08 + 0.2, duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.button>
  );
}
