import crypto from 'crypto';

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL ?? '';
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
export const DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? '';

// Token cache — evita chamadas OAuth repetidas (valido 55 minutos)
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const input = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(input);
  const sig = sign.sign(PRIVATE_KEY, 'base64url');
  const jwt = `${input}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token?: string; error_description?: string };
  if (!data.access_token) throw new Error(`Google OAuth falhou: ${data.error_description ?? JSON.stringify(data)}`);

  tokenCache = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return data.access_token;
}

async function drivePost(path: string, body: unknown): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function driveGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const token = await getAccessToken();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createDriveFolder(name: string, parentId: string): Promise<string> {
  const data = await drivePost('files', {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  }) as { id?: string };
  if (!data.id) throw new Error(`Erro ao criar pasta "${name}" no Google Drive`);
  return data.id;
}

export type SellerFolders = { rootId: string; inboxId: string; sentId: string };

export async function createSellerFolders(emailPrefix: string): Promise<SellerFolders> {
  if (!DRIVE_ROOT_FOLDER_ID) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não definido');
  const rootId = await createDriveFolder(emailPrefix, DRIVE_ROOT_FOLDER_ID);
  const [inboxId, sentId] = await Promise.all([
    createDriveFolder('Inbox', rootId),
    createDriveFolder('Enviados', rootId),
  ]);
  return { rootId, inboxId, sentId };
}

export type DriveFile = { id: string; name: string; createdTime: string };

export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const q = `'${folderId}' in parents and mimeType='application/json' and trashed=false`;
  const data = await driveGet('files', {
    q,
    fields: 'files(id,name,createdTime)',
    orderBy: 'createdTime desc',
    pageSize: '50',
  }) as { files?: DriveFile[] };
  return data.files ?? [];
}

export async function readDriveFile(fileId: string): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Erro ao ler ficheiro Drive ${fileId}: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function saveFileToDrive(
  folderId: string,
  filename: string,
  content: Record<string, unknown>,
): Promise<string> {
  const token = await getAccessToken();
  const boundary = 'ls_drive_boundary';
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(content),
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const data = await res.json() as { id?: string };
  if (!data.id) throw new Error(`Erro ao guardar ficheiro no Drive: ${JSON.stringify(data)}`);
  return data.id;
}

export type DriveFolder = { id: string; name: string };

export async function listSubfoldersInFolder(folderId: string): Promise<DriveFolder[]> {
  const q = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await driveGet('files', {
    q,
    fields: 'files(id,name)',
    orderBy: 'name',
    pageSize: '50',
  }) as { files?: DriveFolder[] };
  return data.files ?? [];
}

export function isDriveConfigured(): boolean {
  return !!(CLIENT_EMAIL && PRIVATE_KEY && DRIVE_ROOT_FOLDER_ID);
}
