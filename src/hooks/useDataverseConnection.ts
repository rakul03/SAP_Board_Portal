import { useEffect, useState, useCallback } from 'react';
import { dataverseConnection, type ConnectionStatus } from '../services/DataverseConnection';

/**
 * Hook to monitor Dataverse connection status
 * Auto-updates when status changes
 */
export function useDataverseConnection() {
  const [status, setStatus] = useState<ConnectionStatus>(dataverseConnection.getStatus());
  const [isInitializing, setIsInitializing] = useState(true);

  // Update status on mount and whenever connection status changes
  useEffect(() => {
    const checkStatus = () => {
      setStatus(dataverseConnection.getStatus());
    };

    // Check initial status
    checkStatus();
    setIsInitializing(false);

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const forceCheck = useCallback(async () => {
    await dataverseConnection.checkConnection();
    setStatus(dataverseConnection.getStatus());
  }, []);

  return {
    isConnected: status.isConnected,
    isInitializing,
    lastChecked: status.lastChecked,
    error: status.error,
    forceCheck,
  };
}

/**
 * Hook to initialize Dataverse connection on app startup
 * Should be called once in App component
 */
export function useInitializeDataverse() {
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeAsync = async () => {
      try {
        console.log('🚀 Starting Dataverse initialization...');
        await dataverseConnection.initialize();
        if (isMounted) {
          setInitialized(true);
          console.log('✅ Dataverse initialization complete');
        }
      } catch (error) {
        if (isMounted) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to initialize Dataverse';
          setInitError(errorMsg);
          console.error('❌ Dataverse initialization failed:', errorMsg);
        }
      }
    };

    initializeAsync();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    initialized,
    initError,
  };
}
