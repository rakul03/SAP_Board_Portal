/**
 * Power Automate Flow Service
 * Calls Power Automate flows to interact with SharePoint via Power Apps SDK
 */

export interface SharePointDocument {
  ID: number;
  Title: string;
  Created: string;
  Modified: string;
  Author?: string;
  [key: string]: unknown;
}

function getFlowConnector(): unknown {
  const win = window as any;

  // Try different context paths
  const context1 = win.Microsoft?.PowerApps?.Context?.parameters?.logicflows;
  if (context1) {
    console.log('Found flow connector at: Microsoft.PowerApps.Context.parameters.logicflows');
    return context1;
  }

  const context2 = win.Microsoft?.PowerApps?.parameters?.logicflows;
  if (context2) {
    console.log('Found flow connector at: Microsoft.PowerApps.parameters.logicflows');
    return context2;
  }

  const context3 = win.PCF?.getMetadataRepository?.()?.parameters?.logicflows;
  if (context3) {
    console.log('Found flow connector at: PCF.getMetadataRepository().parameters.logicflows');
    return context3;
  }

  // Debug: Log what's available
  console.warn('Power Apps context paths checked:');
  console.warn('Microsoft:', win.Microsoft);
  console.warn('PowerApps:', win.Microsoft?.PowerApps);
  console.warn('Context:', win.Microsoft?.PowerApps?.Context);
  console.warn('Parameters:', win.Microsoft?.PowerApps?.Context?.parameters);
  console.warn('PCF:', win.PCF);

  throw new Error('Power Apps context not available - flow connector could not be found');
}

export async function getDocumentsFromFlow(): Promise<SharePointDocument[]> {
  try {
    console.log('Getting flow connector...');
    const flowConnector = getFlowConnector();

    if (!flowConnector) {
      throw new Error('Logic flows connector not available');
    }

    console.log('Invoking flow: GetSharePointDocuments');
    const result = await (flowConnector as any).invoke('GetSharePointDocuments', {});

    console.log('Flow result:', result);

    if (!result) {
      throw new Error('Flow returned no data');
    }

    return result.items || result || [];
  } catch (error) {
    console.error('Error fetching documents from Power Automate:', error);
    throw error;
  }
}
