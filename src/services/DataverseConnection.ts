import { Sap_initiative_sapsService } from '../generated/services/Sap_initiative_sapsService';
import { Sap_portfolioowner_sapsService } from '../generated/services/Sap_portfolioowner_sapsService';
import { Sap_auditlog_sapsService } from '../generated/services/Sap_auditlog_sapsService';

export interface ConnectionStatus {
  isConnected: boolean
  lastChecked: Date | null
  error?: string
}

const INIT_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

class DataverseConnection {
  private status: ConnectionStatus = {
    isConnected: false,
    lastChecked: null,
  };

  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Returns true when the app is embedded inside the Power Apps host iframe.
   * The SDK requires postMessage communication with the host — it will hang
   * indefinitely when opened as a plain localhost URL.
   */
  isInsidePowerAppsHost(): boolean {
    try {
      return window !== window.parent;
    } catch {
      return true; // cross-origin parent means we're in an iframe
    }
  }

  async initialize(): Promise<void> {
    if (!this.isInsidePowerAppsHost()) {
      const msg =
        'This app must be opened via the Power Apps Local Play URL.\n\n' +
        'Run "npm run dev" and open the URL shown as "Local Play" in the console:\n' +
        'https://apps.powerapps.com/play/e/{environmentId}/a/local?_localAppUrl=...';
      this.status = { isConnected: false, lastChecked: new Date(), error: msg };
      throw new Error(msg);
    }

    try {
      console.log('🔄 Initializing Dataverse connection...');

      await withTimeout(
        this.verifyConnection(),
        INIT_TIMEOUT_MS,
        `Dataverse connection timed out after ${INIT_TIMEOUT_MS / 1000}s. ` +
        'Ensure the app is opened via the Power Apps Local Play URL, not directly via localhost.'
      );

      this.status = { isConnected: true, lastChecked: new Date() };
      console.log('✅ Dataverse connection initialized successfully');
      this.startHealthChecks();
    } catch (error) {
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.error('❌ Failed to initialize Dataverse connection:', error);
      throw error;
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      await Promise.all([
        Sap_initiative_sapsService.getMetadata(),
        Sap_portfolioowner_sapsService.getMetadata(),
        Sap_auditlog_sapsService.getMetadata(),
      ]);
      console.log('✅ All Dataverse services connected');
    } catch (error) {
      console.error('❌ Dataverse service connection failed:', error);
      throw new Error('Unable to connect to Dataverse services');
    }
  }

  private startHealthChecks(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(async () => {
      try {
        await this.verifyConnection();
        this.status.isConnected = true;
        this.status.lastChecked = new Date();
        this.status.error = undefined;
      } catch (error) {
        this.status.isConnected = false;
        this.status.lastChecked = new Date();
        this.status.error = error instanceof Error ? error.message : 'Health check failed';
        console.warn('⚠️ Dataverse health check failed:', this.status.error);
      }
    }, 5 * 60 * 1000);
  }

  dispose(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  getStatus(): Readonly<ConnectionStatus> {
    return Object.freeze({ ...this.status });
  }

  isConnected(): boolean {
    return this.status.isConnected;
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.verifyConnection();
      this.status.isConnected = true;
      this.status.lastChecked = new Date();
      this.status.error = undefined;
      return true;
    } catch (error) {
      this.status.isConnected = false;
      this.status.lastChecked = new Date();
      this.status.error = error instanceof Error ? error.message : 'Connection check failed';
      return false;
    }
  }
}

export const dataverseConnection = new DataverseConnection();
