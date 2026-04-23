import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LaunchScreen } from './components/LaunchScreen';
import { LoginScreen } from './screens/LoginScreen';
import { Home } from './screens/Home';
import { Modal } from './components/Modal';
import { ManageOwnersPanel } from './components/ManageOwnersPanel';
import { InitiativeForm } from './components/InitiativeForm';
import { DataProvider } from './context/DataContext';
import { useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { useToast } from './context/ToastContext';
import { ToastProvider } from './context/ToastContext';
import { useInitializeDataverse } from './hooks/useDataverseConnection';
import type { Category, TabId } from './types';
import styles from './App.module.css';

const Initiatives = lazy(() =>
  import('./screens/Initiatives').then((m) => ({ default: m.Initiatives })),
);
const CategorySelection = lazy(() =>
  import('./screens/CategorySelection').then((m) => ({ default: m.CategorySelection })),
);
const Favorites = lazy(() =>
  import('./screens/Favorites').then((m) => ({ default: m.Favorites })),
);
const AllInitiatives = lazy(() =>
  import('./screens/AllInitiatives').then((m) => ({ default: m.AllInitiatives })),
);
const InitiativeDetail = lazy(() =>
  import('./screens/InitiativeDetail').then((m) => ({ default: m.InitiativeDetail })),
);
const AuditLogs = lazy(() =>
  import('./screens/AuditLogs').then((m) => ({ default: m.AuditLogs })),
);
const Dashboard = lazy(() =>
  import('./screens/Dashboard').then((m) => ({ default: m.Dashboard })),
);
function ScreenFallback() {
  return <div className={styles.fallback} aria-busy="true" />;
}

type AppStage = 'login' | 'launch' | 'app';

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 960 : false,
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 960);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

function AppShell() {
  const { createInitiative } = useData();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>('home');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [portfolioView, setPortfolioView] = useState<'categories' | 'favorites' | 'all-initiatives'>('categories');
  const [ownersOpen, setOwnersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  const handleNavigate = (id: TabId) => {
    setTab(id);
    setDetailId(null);
    setSelectedCategory(null);
    if (id === 'home') {
      setPortfolioView('categories');
    }
    setSidebarOpen(false);
  };

  const viewKey =
    tab === 'home'
      ? `home:${portfolioView}`
      : tab === 'initiatives'
        ? detailId
          ? `detail:${detailId}`
          : selectedCategory
            ? `initiatives:${selectedCategory}`
            : 'initiatives:categories'
        : tab;

  return (
    <div className={styles.shell}>
      <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} isMobile={isMobile} />
      <div
        className={styles.body}
        data-sidebar={sidebarOpen ? 'expanded' : 'collapsed'}
        data-overlay={sidebarOpen ? 'open' : 'closed'}
      >
        <Sidebar
          active={tab}
          expanded={sidebarOpen}
          onNavigate={handleNavigate}
          onBackdrop={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
        <main className={styles.main}>
          <AnimatePresence mode="wait">
            <motion.div
              key={viewKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className={styles.content}
            >
              {tab === 'home' && <Home onNavigate={handleNavigate} />}
              {tab !== 'home' && (
                <Suspense fallback={<ScreenFallback />}>
                  {tab === 'initiatives' && !detailId && portfolioView === 'categories' && !selectedCategory && (
                    <CategorySelection
                      onSelect={setSelectedCategory}
                      onViewFavorites={() => setPortfolioView('favorites')}
                      onViewAllInitiatives={() => setPortfolioView('all-initiatives')}
                      onManageOwners={() => setOwnersOpen(true)}
                      onAddInitiative={() => setCreateOpen(true)}
                    />
                  )}
                  {tab === 'initiatives' && !detailId && portfolioView === 'favorites' && (
                    <Favorites onOpenDetail={setDetailId} onBack={() => setPortfolioView('categories')} />
                  )}
                  {tab === 'initiatives' && !detailId && portfolioView === 'all-initiatives' && (
                    <AllInitiatives onOpenDetail={setDetailId} onBack={() => setPortfolioView('categories')} />
                  )}
                  {tab === 'initiatives' && !detailId && selectedCategory && (
                    <Initiatives
                      selectedCategory={selectedCategory}
                      onBack={() => setSelectedCategory(null)}
                      onOpenDetail={setDetailId}
                    />
                  )}
                  {tab === 'initiatives' && detailId && (
                    <InitiativeDetail
                      initiativeId={detailId}
                      onBack={() => setDetailId(null)}
                    />
                  )}
                  {tab === 'audit-logs' && <AuditLogs />}
                  {tab === 'dashboard' && <Dashboard />}
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <Modal
          isOpen={ownersOpen}
          onClose={() => setOwnersOpen(false)}
          title="Manage Owners"
          size="md"
        >
          <ManageOwnersPanel />
        </Modal>
        <Modal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create Initiative"
          size="lg"
        >
          <Suspense fallback={<ScreenFallback />}>
            <InitiativeForm
              onSubmit={async (values) => {
                const created = await createInitiative(values);
                if (created) {
                  setCreateOpen(false);
                  showToast(`Initiative "${created.name}" created.`, 'success');
                } else {
                  showToast('Failed to create initiative.', 'error');
                }
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </Suspense>
        </Modal>
      </div>
    </div>
  );
}

function AppInner() {
  const [stage, setStage] = useState<AppStage>('login');

  return (
    <>
      {stage === 'login' && <LoginScreen onLogin={() => setStage('launch')} />}
      <AnimatePresence>
        {stage === 'launch' && (
          <LaunchScreen onComplete={() => setStage('app')} />
        )}
      </AnimatePresence>
      {stage === 'app' && <AppShell />}
    </>
  );
}

function DataverseInitializer({ children }: { children: React.ReactNode }) {
  const { initialized, initError } = useInitializeDataverse();

  if (initError) {
    const isHostError = initError.includes('Local Play URL') || initError.includes('timed out');
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#faf9f7',
        }}
      >
        <h1 style={{ margin: '0 0 4px 0', color: '#23221f', fontSize: '1.4rem' }}>Dataverse Connection Error</h1>
        {isHostError ? (
          <div style={{ maxWidth: '520px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 12px 0', color: '#444', lineHeight: 1.6 }}>
              This app must be opened through the <strong>Power Apps Local Play URL</strong>, not directly via localhost.
            </p>
            <div
              style={{
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                borderRadius: '6px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.7,
                marginBottom: '16px',
              }}
            >
              <div style={{ color: '#6a9955' }}># Step 1: Start the dev server (if not already running)</div>
              <div>npm run dev</div>
              <div style={{ marginTop: '10px', color: '#6a9955' }}># Step 2: Copy the "Local Play" URL from the console output:</div>
              <div style={{ color: '#ce9178' }}>https://apps.powerapps.com/play/e/&lt;env&gt;/a/local?_localAppUrl=...</div>
              <div style={{ marginTop: '10px', color: '#6a9955' }}># Step 3: Open that URL in your browser</div>
            </div>
            <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>
              The app uses the Power Apps SDK which requires the Power Apps host to authenticate with Dataverse.
            </p>
          </div>
        ) : (
          <p style={{ margin: '0 0 16px 0', color: '#666', maxWidth: '400px' }}>{initError}</p>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 20px',
            backgroundColor: '#0f4024',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '8px',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#faf9f7',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #0f4024',
            borderTop: '3px solid #faf9f7',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#666', margin: '0' }}>Initializing Dataverse Connection...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <DataverseInitializer>
        <DataProvider>
          <ToastProvider>
            <AppInner />
          </ToastProvider>
        </DataProvider>
      </DataverseInitializer>
    </ThemeProvider>
  );
}
