import { config } from '../config';
import { graphFetch, graphUpload } from './graph-client';
import {
  AzureCredentials,
  GraphDriveItem,
  GraphSharingLink,
  DocumentAttachment,
  Tenant,
} from '../types';
import { mapWithConcurrency } from '../utils/resilience';

interface ChildrenResponse {
  value: GraphDriveItem[];
}

function toAzureCredentials(tenant: Tenant): AzureCredentials {
  return {
    tenantId: tenant.azureTenantId,
    clientId: tenant.azureClientId,
    clientSecret: tenant.azureClientSecret,
  };
}

function getUserDrivePath(hrUserId: string): string {
  return `/users/${hrUserId}/drive`;
}

/**
 * Ensures the root onboarding folder exists, then creates
 * a subfolder named after the employee. Returns the subfolder metadata.
 */
export async function createEmployeeFolder(
  employeeName: string,
  tenant: Tenant
): Promise<GraphDriveItem> {
  const credentials = toAzureCredentials(tenant);
  const drivePath = getUserDrivePath(tenant.hrUserId);

  const rootFolder = await ensureFolder(
    'root',
    tenant.oneDriveRootFolder,
    drivePath,
    credentials
  );

  return ensureFolder(rootFolder.id, employeeName, drivePath, credentials);
}

async function ensureFolder(
  parentItemId: string,
  folderName: string,
  drivePath: string,
  credentials: AzureCredentials
): Promise<GraphDriveItem> {
  const existing = await findChildFolder(parentItemId, folderName, drivePath, credentials);
  if (existing) {
    return existing;
  }

  return graphFetch<GraphDriveItem>(
    `${drivePath}/items/${parentItemId}/children`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    },
    credentials
  );
}

async function findChildFolder(
  parentItemId: string,
  folderName: string,
  drivePath: string,
  credentials: AzureCredentials
): Promise<GraphDriveItem | null> {
  try {
    const response = await graphFetch<ChildrenResponse>(
      `${drivePath}/items/${parentItemId}/children?$filter=name eq '${encodeURIComponent(folderName)}'`,
      {},
      credentials
    );
    return response.value.find((item) => item.folder !== undefined) || null;
  } catch {
    return null;
  }
}

/**
 * Uploads a single document to the employee's OneDrive folder.
 * Files up to 4MB use simple upload; larger files would need
 * a resumable upload session (not implemented — PDFs rarely exceed 4MB).
 */
export async function uploadDocument(
  folderId: string,
  attachment: DocumentAttachment,
  tenant: Tenant
): Promise<GraphDriveItem> {
  const content = Buffer.from(attachment.contentBytes, 'base64');
  const credentials = toAzureCredentials(tenant);
  const drivePath = getUserDrivePath(tenant.hrUserId);

  return graphUpload<GraphDriveItem>(
    `${drivePath}/items/${folderId}:/${encodeURIComponent(attachment.normalizedName)}:/content`,
    content,
    credentials
  );
}

export interface UploadResult {
  uploaded: string[];
  failed: Array<{ name: string; error: string }>;
}

/**
 * Uploads documents concurrently with bounded parallelism.
 * Continues uploading remaining files even if some fail, returning
 * both successful and failed uploads for partial-success tracking.
 */
export async function uploadAllDocuments(
  folderId: string,
  attachments: DocumentAttachment[],
  tenant: Tenant
): Promise<UploadResult> {
  const settled = await mapWithConcurrency(
    attachments,
    config.processing.uploadConcurrency,
    async (attachment) => {
      await uploadDocument(folderId, attachment, tenant);
      return attachment.normalizedName;
    }
  );

  const uploaded: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      uploaded.push(outcome.value);
    } else {
      const errorMsg = outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);
      failed.push({ name: attachments[i].normalizedName, error: errorMsg });
    }
  }

  return { uploaded, failed };
}

/**
 * Creates a view-only sharing link for the employee's folder
 * so HR can share it internally.
 */
export async function createSharingLink(
  folderId: string,
  tenant: Tenant
): Promise<string> {
  const credentials = toAzureCredentials(tenant);
  const drivePath = getUserDrivePath(tenant.hrUserId);

  const response = await graphFetch<GraphSharingLink>(
    `${drivePath}/items/${folderId}/createLink`,
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'view',
        scope: 'organization',
      }),
    },
    credentials
  );

  return response.link.webUrl;
}
