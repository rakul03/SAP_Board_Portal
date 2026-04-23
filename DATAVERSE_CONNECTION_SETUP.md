# Dataverse Connection Setup Guide

## Overview

This guide walks through setting up and initializing the Dataverse connection in your React application. The setup includes connection management, error handling, and status monitoring.

## Architecture

```
App Component
    ↓
useInitializeDataverse() [once on app start]
    ↓
dataverseConnection.initialize()
    ├─ Verify connection (test all services)
    ├─ Initialize owner ID counter
    └─ Start periodic health checks
    ↓
DataverseService ready for operations
```

## Files Created

### 1. `src/services/DataverseConnection.ts`
- Manages Dataverse connection lifecycle
- Performs health checks
- Initializes owner ID counter
- Provides connection status

**Key Methods:**
```typescript
await dataverseConnection.initialize()      // Initialize on app startup
dataverseConnection.isConnected()           // Check current status
await dataverseConnection.checkConnection() // Force status check
dataverseConnection.getStatus()             // Get detailed status
dataverseConnection.dispose()               // Cleanup
```

### 2. `src/hooks/useDataverseConnection.ts`
- React hooks for connection status monitoring
- Auto-updates on status changes
- Provides initialization hook for app startup

**Hooks:**
```typescript
useInitializeDataverse()    // Call once in App component
useDataverseConnection()    // Monitor connection status in components
```

### 3. `src/services/DataverseErrorHandler.ts`
- Centralized error parsing and handling
- Retry logic with exponential backoff
- User-friendly error messages
- Error recovery detection

**Usage:**
```typescript
DataverseErrorHandler.retry(operation, maxRetries)
DataverseErrorHandler.parseError(error)
withDataverseErrorHandling(operation, context)
```

### 4. `src/services/DataverseService.ts` (Already Created)
- CRUD operations for all three tables
- Owner ID generation
- Model mapping

## Integration Steps

### Step 1: Update App Component

Modify `src/App.tsx` to initialize Dataverse connection:

```typescript
import { useInitializeDataverse } from './hooks/useDataverseConnection';

function App() {
  const { initialized, initError } = useInitializeDataverse();

  // Show error if initialization fails
  if (initError) {
    return (
      <div className={styles.error}>
        <h1>Connection Error</h1>
        <p>{initError}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  // Show loading until initialized
  if (!initialized) {
    return (
      <div className={styles.loading}>
        <p>Initializing Dataverse connection...</p>
      </div>
    );
  }

  // Rest of app...
  return (
    <DataProvider>
      <ThemeProvider>
        <ToastProvider>
          {/* Your app content */}
        </ToastProvider>
      </ThemeProvider>
    </DataProvider>
  );
}
```

### Step 2: Update DataContext to Use Connection Status

In `src/context/DataContext.tsx`:

```typescript
import { useDataverseConnection } from '../hooks/useDataverseConnection';
import { dataverseService } from '../services/DataverseService';

export function DataProvider({ children }: { children: ReactNode }) {
  const { isConnected, error } = useDataverseConnection();
  
  const load = useCallback(async () => {
    try {
      if (!isConnected) {
        throw new Error('Dataverse is not connected');
      }

      // Use dataverseService instead of localStorage
      const initiatives = await dataverseService.getInitiatives();
      const auditLogs = await dataverseService.getAuditLogs();
      const owners = await dataverseService.getOwners();

      setInitiatives(initiatives);
      setAuditLogs(auditLogs);
      setOwners(owners);
    } catch (error) {
      console.error('Failed to load from Dataverse:', error);
      // Fallback to localStorage
    }
  }, [isConnected]);

  // ... rest of DataContext
}
```

### Step 3: Add Connection Status Display (Optional)

Create a component to show connection status:

```typescript
// src/components/ConnectionStatus.tsx
import { useDataverseConnection } from '../hooks/useDataverseConnection';

export function ConnectionStatus() {
  const { isConnected, lastChecked, error } = useDataverseConnection();

  if (!isConnected) {
    return (
      <div className="status-error">
        <span>⚠️ Disconnected</span>
        {error && <span title={error}>Error: {error}</span>}
      </div>
    );
  }

  return (
    <div className="status-ok">
      <span>✅ Connected</span>
      {lastChecked && (
        <span className="timestamp">
          Last checked: {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
```

## Usage in Components

### Using DataverseService for CRUD Operations

```typescript
import { dataverseService } from '../services/DataverseService';
import { DataverseErrorHandler } from '../services/DataverseErrorHandler';

function MyComponent() {
  const handleCreate = async (data: InitiativeData) => {
    try {
      // With error handling and retry
      const initiative = await DataverseErrorHandler.retry(
        () => dataverseService.createInitiative(data),
        3, // max retries
      );
      
      console.log('✅ Created:', initiative);
    } catch (error) {
      const parsedError = DataverseErrorHandler.parseError(error);
      console.error(DataverseErrorHandler.getUserMessage(parsedError));
    }
  };

  return <button onClick={...}>Create</button>;
}
```

### Monitoring Connection in Components

```typescript
function MyComponent() {
  const { isConnected, forceCheck } = useDataverseConnection();

  if (!isConnected) {
    return (
      <div>
        <p>Dataverse is disconnected</p>
        <button onClick={forceCheck}>Check Connection</button>
      </div>
    );
  }

  return <div>Connected and ready</div>;
}
```

## Connection Lifecycle

### On App Startup
1. `useInitializeDataverse()` called in App component
2. `dataverseConnection.initialize()` executes:
   - Tests all three Dataverse services
   - Initializes owner ID counter
   - Starts periodic health checks (every 5 minutes)
3. App displays content once initialized

### During App Runtime
- Periodic health checks run every 5 minutes
- Components can check connection status via `useDataverseConnection()`
- Components can force a status check if needed
- Errors are logged with context

### On App Unmount
- Health check interval is cleared (automatic with React cleanup)
- `dataverseConnection.dispose()` is called (optional but recommended)

## Error Handling Strategy

### Automatic Retry with Exponential Backoff

```typescript
// Automatically retries with delays: 1s, 2s, 4s, 8s, 16s
await DataverseErrorHandler.retry(
  () => dataverseService.createInitiative(data),
  5,      // max retries
  1000,   // base delay in ms
);
```

**Retry Pattern:**
- Attempt 1: Fail → Wait 1s
- Attempt 2: Fail → Wait 2s
- Attempt 3: Fail → Wait 4s
- Attempt 4: Fail → Wait 8s
- Attempt 5: Fail → Throw error

### Manual Error Handling

```typescript
try {
  await dataverseService.createInitiative(data);
} catch (error) {
  const dvError = DataverseErrorHandler.parseError(error);
  
  if (DataverseErrorHandler.isRecoverable(dvError)) {
    // Show retry option
    showToast(DataverseErrorHandler.getSuggestedAction(dvError));
  } else {
    // Show error message
    showToast(DataverseErrorHandler.getUserMessage(dvError));
  }
}
```

## Health Checks

### Automatic Health Checks
- Run every 5 minutes
- Test all three services
- Update connection status
- Log warnings if disconnected

### Manual Health Checks
```typescript
const { isConnected, forceCheck } = useDataverseConnection();

// When user wants to check
await forceCheck();
```

### Health Check Response

```typescript
interface ConnectionStatus {
  isConnected: boolean        // true if all services responding
  lastChecked: Date | null    // when last check occurred
  error?: string              // error message if disconnected
}
```

## Best Practices

### 1. Always Initialize on App Startup
```typescript
// In App.tsx
const { initialized } = useInitializeDataverse();

if (!initialized) {
  return <LoadingScreen />;
}
```

### 2. Check Connection Before Critical Operations
```typescript
const { isConnected } = useDataverseConnection();

if (!isConnected) {
  showToast('Dataverse is disconnected. Please try again.');
  return;
}

await dataverseService.deleteInitiative(id);
```

### 3. Use Retry for Transient Failures
```typescript
// Network hiccups? Retry automatically
const owner = await DataverseErrorHandler.retry(
  () => dataverseService.createOwner(name),
  3,
);
```

### 4. Provide User Feedback
```typescript
try {
  await operation();
  showToast('✅ Success!', 'success');
} catch (error) {
  const msg = DataverseErrorHandler.getUserMessage(error);
  showToast(`❌ ${msg}`, 'error');
}
```

### 5. Log Errors with Context
```typescript
DataverseErrorHandler.logError('InitiativeForm::handleSubmit', error, {
  initiativeName: data.name,
  category: data.category,
});
```

## Troubleshooting

### "Dataverse connection failed on startup"
1. Check internet connection
2. Verify Dataverse environment is accessible
3. Check browser console for detailed error
4. Try: `dataverseConnection.checkConnection()`

### "Owner ID counter not initialized"
1. Ensure `useInitializeDataverse()` is called
2. Check that `await dataverseConnection.initialize()` completed
3. Verify owner fetch works: `dataverseService.getOwners()`

### "Operations fail with network errors"
1. Check internet connectivity
2. Verify Dataverse service is online
3. Retry with exponential backoff
4. Check browser DevTools Network tab

### "Connection keeps dropping"
1. May indicate Dataverse service issues
2. Check Dataverse status page
3. Monitor console for health check warnings
4. Implement manual reconnection button

## Testing Connection

### Test Individual Service
```typescript
import { Sap_initiative_sapsService } from '../generated/services/Sap_initiative_sapsService';

const metadata = await Sap_initiative_sapsService.getMetadata();
console.log('Initiative service is connected');
```

### Test Connection Manager
```typescript
import { dataverseConnection } from '../services/DataverseConnection';

const status = dataverseConnection.getStatus();
console.log('Connection status:', status);

await dataverseConnection.checkConnection();
```

### Test Full Integration
```typescript
import { dataverseService } from '../services/DataverseService';

const owners = await dataverseService.getOwners();
console.log('Retrieved owners:', owners);
```

## Performance Considerations

- **Health checks:** Run every 5 minutes (configurable)
- **Metadata calls:** Lightweight, no data transfer
- **Retry delays:** Exponential backoff prevents hammering server
- **Connection status:** Cached in React state, updates via callbacks

## Reference

- **Connection Manager:** `src/services/DataverseConnection.ts`
- **React Hooks:** `src/hooks/useDataverseConnection.ts`
- **Error Handler:** `src/services/DataverseErrorHandler.ts`
- **CRUD Service:** `src/services/DataverseService.ts`
- **Generated Services:** `src/generated/services/*`
- **Configuration:** `.power/schemas/appschemas/dataSourcesInfo.ts`
