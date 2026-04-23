import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import styles from './LaunchScreen.module.css';

interface LaunchScreenProps {
  onComplete: () => void;
}

export function LaunchScreen({ onComplete }: LaunchScreenProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 1700);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className={styles.root}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <div className={styles.glow} aria-hidden />
      <div className={styles.center}>
        <motion.div
          className={styles.mark}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <BarChart3 size={38} />
        </motion.div>
        <motion.h1
          className={styles.title}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          SAP Board Portfolio
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          Initialising your workspace…
        </motion.p>
        <motion.div
          className={styles.bar}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.3, delay: 0.3, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
