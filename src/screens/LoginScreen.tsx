import { motion, type Variants } from 'framer-motion';
import {
  BarChart3,
  Layers,
  Loader2,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import styles from './LoginScreen.module.css';

interface LoginScreenProps {
  onLogin: () => void;
}

const FEATURES = [
  { icon: BarChart3, label: 'Real-time portfolio analytics' },
  { icon: ShieldCheck, label: 'Board-level compliance tracking' },
  { icon: TrendingUp, label: 'Strategic initiative management' },
  { icon: Layers, label: 'Cross-domain visibility' },
];

// Variants for staggered entrance
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { initiatives } = useData();
  const [loading, setLoading] = useState(false);

  // Compute live stats from Dataverse
  const stats = useMemo(() => {
    const total = initiatives.length;
    const delayed = initiatives.filter(i => i.status === 'Delayed').length;
    const categories = new Set(initiatives.map(i => i.category)).size;

    const health = total === 0 ? 100 : Math.round(((total - delayed) / total) * 100);

    return [
      { value: total > 0 ? `${total}+` : '0', label: 'Initiatives' },
      { value: categories > 0 ? categories : '0', label: 'Domains' },
      { value: `${health}%`, label: 'Health Index' },
    ];
  }, [initiatives]);

  function handleGetStarted() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1100);
  }

  return (
    <div className={styles.root}>
      <motion.aside
        className={styles.left}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className={styles.blobs}>
          <motion.div
            className={styles.blobA}
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0], x: [0, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className={styles.blobB}
            animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 0], y: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <motion.div
            className={styles.blobC}
            animate={{ scale: [1, 0.9, 1], x: [0, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>
        <div className={styles.grid} aria-hidden />

        <motion.div className={styles.brand} variants={itemVariants}>
          <div className={styles.logo}>SAP</div>
          <span className={styles.brandLabel}>Board Portfolio</span>
        </motion.div>

        <div className={styles.hero}>
          <motion.div className={styles.heroIcon} variants={itemVariants}>
            <BarChart3 size={24} />
          </motion.div>
          <motion.h1 className={styles.heroTitle} variants={itemVariants}>
            Strategic Portfolio Governance.
          </motion.h1>
          <motion.p className={styles.heroSubtitle} variants={itemVariants}>
            An analytical, high-density command centre for board-level oversight and real-time initiative tracking.
          </motion.p>
        </div>

        <motion.ul className={styles.features} variants={containerVariants}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <motion.li
              key={label}
              variants={itemVariants}
              whileHover={{ x: 6, color: '#fff' }}
              transition={{ duration: 0.2 }}
            >
              <span className={styles.featureIcon}>
                <Icon size={16} />
              </span>
              {label}
            </motion.li>
          ))}
        </motion.ul>

        <motion.div className={styles.stats} variants={containerVariants}>
          {stats.map((s, idx) => (
            <motion.div
              key={s.label}
              className={styles.statChip}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02, borderColor: 'rgba(255,255,255,0.3)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.span
                className={styles.statValue}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 + idx * 0.1 }}
              >
                {s.value}
              </motion.span>
              <span className={styles.statLabel}>{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.footer className={styles.footer} variants={itemVariants}>
          © 2026 DEWA — Confidential &amp; Proprietary. Strategic Oversight Division.
        </motion.footer>
      </motion.aside>

      <motion.section
        className={styles.right}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          className={styles.card}
          variants={cardVariants}
        >
          <div className={styles.ctaHeader}>
            <motion.div
              className={styles.ctaIcon}
              animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles size={28} />
            </motion.div>
            <h2>Ready to Explore?</h2>
            <p>Access the unified portfolio command center</p>
          </div>

          <div className={styles.ctaContent}>
            <motion.div
              className={styles.featureHighlight}
              variants={containerVariants}
            >
              {[
                'Instant access to all domains',
                'Real-time Dataverse synchronization',
                'Advanced compliance oversight',
              ].map((text, i) => (
                <motion.div
                  key={i}
                  className={styles.highlightItem}
                  variants={itemVariants}
                >
                  <div className={styles.checkmark}>✓</div>
                  <span>{text}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.button
              className={styles.ctaButton}
              onClick={handleGetStarted}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              variants={itemVariants}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className={styles.spin} />
                  <span>Initialising...</span>
                </>
              ) : (
                <>
                  <span>Get Started</span>
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>

            <p className={styles.ctaNote}>
              Authorized personnel only. Access subject to security logging.
            </p>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
