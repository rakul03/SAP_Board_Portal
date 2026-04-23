import { Menu, Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useDataverseConnection } from '../hooks/useDataverseConnection';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  isMobile: boolean;
}

export function Header({ onToggleSidebar, sidebarOpen, isMobile }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const { currentUser } = useData();
  const { isConnected } = useDataverseConnection();

  const initials = useMemo(() => {
    const source = currentUser?.displayName || currentUser?.mail || 'User';
  const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }, [currentUser]);
  const connectionLabel = isConnected ? 'Online' : 'Offline';

  return (
    <header
      className={styles.header}
      data-sidebar={sidebarOpen ? 'expanded' : 'collapsed'}
      data-mobile={isMobile ? 'true' : 'false'}
    >
      <div className={styles.left}>
        <button
          className={`${styles.hamburger} ${sidebarOpen ? styles.hamburgerActive : ''}`}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
        >
          <Menu size={18} />
        </button>
        <div className={styles.brand}>
          <span className={styles.brandAccent}>SAP</span>
          <span className={styles.brandRest}>Board Portfolio</span>
        </div>
      </div>

      <div className={styles.right}>
        <span
          className={`${styles.connectionPill} ${isConnected ? styles.connectionOnline : styles.connectionOffline}`}
          aria-label={`Dataverse ${connectionLabel.toLowerCase()}`}
        >
          <span className={styles.connectionDot} />
          Dataverse
          <span className={styles.connectionState}>{connectionLabel}</span>
        </span>

        <button
          className={styles.themeToggle}
          onClick={toggle}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <span className={styles.dewa} aria-label="DEWA">
          DEWA
        </span>

        <div className={styles.userChip} aria-label={currentUser?.displayName || 'Signed in user'}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userText}>
            <span className={styles.userName}>{currentUser?.displayName || 'User'}</span>
            {currentUser?.mail && <span className={styles.userMail}>{currentUser.mail}</span>}
          </div>
        </div>
      </div>
    </header>
  );
}
