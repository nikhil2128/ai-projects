import { config } from '../config';
import { graphFetch, graphUpload } from './graph-client';
import { GraphDriveItem, GraphSharingLink, DocumentAttachment } from '../types';

const userDrivePath = `/users/${config.hr.userId}/drive`;

interface ChildrenResponse {
  value: GraphDriveItem[];
}

/**
 * Ensures the root "Onboarding Documents" folder exists, then creates
 * a subfolder named after the employee. Returns the subfolder metadata.
 */
export async function createEmployeeFolder(
  employeeName: string
): Promise<GraphDriveItem> {
  const rootFolder = await ensureFolder(
    'root',
    config.onedrive.rootFolder
  );

  return ensureFolder(rootFolder.id, employeeName);
}

async function ensureFolder(
  parentItemId: string,
  folderName: string
): Promise<GraphDriveItem> {
  const existing = await findChildFolder(parentItemId, folderName);
  if (existing) {
    return existing;
  }

  return graphFetch<GraphDriveItem>(
    `${userDrivePath}/items/${parentItemId}/children`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    }
  );
}

async function findChildFolder(
  parentItemId: string,
  folderName: string
): Promise<GraphDriveItem | null> {
  try {
    const response = await graphFetch<ChildrenResponse>(
      `${userDrivePath}/items/${parentItemId}/children?$filter=name eq '${encodeURIComponent(folderName)}'`
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
  attachment: DocumentAttachment
): Promise<GraphDriveItem> {
  const content = Buffer.from(attachment.contentBytes, 'base64');

  return graphUpload<GraphDriveItem>(
    `${userDrivePath}/items/${folderId}:/${encodeURIComponent(attachment.normalizedName)}:/content`,
    content
  );
}

/**
 * Uploads all documents in a submission to the employee's folder.
 */
export async function uploadAllDocuments(
  folderId: string,
  attachments: DocumentAttachment[]
): Promise<string[]> {
  const uploadedNames: string[] = [];

  for (const attachment of attachments) {
    await uploadDocument(folderId, attachment);
    uploadedNames.push(attachment.normalizedName);
  }

  return uploadedNames;
}

/**
 * Creates a view-only sharing link for the employee's folder
 * so HR can share it internally.
 */
export async function createSharingLink(
  folderId: string
): Promise<string> {
  const response = await graphFetch<GraphSharingLink>(
    `${userDrivePath}/items/${folderId}/createLink`,
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'view',
        scope: 'organization',
      }),
    }
  );

  return response.link.webUrl;
}
