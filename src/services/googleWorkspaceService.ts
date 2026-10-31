import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const workspaceAuth = getAuth(app);

export const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/chat.admin.delete',
  'https://www.googleapis.com/auth/chat.admin.memberships',
  'https://www.googleapis.com/auth/chat.admin.memberships.readonly',
  'https://www.googleapis.com/auth/chat.admin.spaces',
  'https://www.googleapis.com/auth/chat.admin.spaces.readonly',
  'https://www.googleapis.com/auth/chat.customemojis',
  'https://www.googleapis.com/auth/chat.customemojis.readonly',
  'https://www.googleapis.com/auth/chat.delete',
  'https://www.googleapis.com/auth/chat.memberships',
  'https://www.googleapis.com/auth/chat.memberships.app',
  'https://www.googleapis.com/auth/chat.memberships.readonly',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.messages.reactions',
  'https://www.googleapis.com/auth/chat.messages.reactions.create',
  'https://www.googleapis.com/auth/chat.messages.reactions.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.spaces.create',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.users.readstate',
  'https://www.googleapis.com/auth/chat.users.readstate.readonly',
  'https://www.googleapis.com/auth/chat.users.sections',
  'https://www.googleapis.com/auth/chat.users.sections.readonly',
  'https://www.googleapis.com/auth/chat.users.spacesettings',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'consent' });

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;

export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(workspaceAuth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleWorkspaceSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(workspaceAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter o token de acesso do Google Workspace.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação Google Workspace:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const workspaceLogout = async () => {
  await workspaceAuth.signOut();
  cachedAccessToken = null;
};

// ============================================================================
// GMAIL API HELPERS
// ============================================================================
export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export async function listGmailMessages(maxResults = 10): Promise<GmailMessageSummary[]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro Gmail (${listRes.status})`);
  }
  const listData = await listRes.json();
  const messages: Array<{ id: string; threadId: string }> = listData.messages || [];

  const details = await Promise.all(
    messages.slice(0, 8).map(async (m) => {
      try {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const headers: Array<{ name: string; value: string }> = data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        return {
          id: m.id,
          threadId: m.threadId,
          snippet: data.snippet || '',
          subject: getHeader('Subject') || '(Sem assunto)',
          from: getHeader('From') || 'Desconhecido',
          date: getHeader('Date') || '',
        };
      } catch {
        return null;
      }
    })
  );

  return details.filter((d): d is GmailMessageSummary => d !== null);
}

export async function sendGmailMessage(to: string, subject: string, bodyText: string): Promise<void> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const mimeMessage = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyText,
  ].join('\r\n');

  const raw = btoa(unescape(encodeURIComponent(mimeMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Falha ao enviar e-mail (${res.status})`);
  }
}

export async function trashGmailMessage(messageId: string): Promise<void> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Falha ao mover e-mail para lixeira (${res.status})`);
  }
}

// ============================================================================
// GOOGLE CHAT API HELPERS
// ============================================================================
export interface ChatSpaceItem {
  name: string;
  displayName: string;
  spaceType?: string;
}

export interface ChatMessageItem {
  name: string;
  text: string;
  createTime?: string;
  senderName?: string;
}

export async function listChatSpaces(): Promise<ChatSpaceItem[]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=20', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const rawMsg = err?.error?.message || `Erro Google Chat (${res.status})`;
    throw new Error(rawMsg);
  }

  const data = await res.json();
  return (data.spaces || []).map((s: any) => ({
    name: s.name,
    displayName: s.displayName || s.name,
    spaceType: s.spaceType || s.type || 'SPACE',
  }));
}

export async function listChatMessages(spaceName: string): Promise<ChatMessageItem[]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=15`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao listar mensagens (${res.status})`);
  }

  const data = await res.json();
  return (data.messages || []).map((m: any) => ({
    name: m.name,
    text: m.text || '(Anexo / Card)',
    createTime: m.createTime,
    senderName: m.sender?.displayName || m.sender?.name || 'Membro',
  }));
}

export async function sendChatMessage(spaceName: string, text: string): Promise<void> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao enviar mensagem (${res.status})`);
  }
}

// ============================================================================
// GOOGLE DRIVE API HELPERS
// ============================================================================
export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export async function listDriveFiles(pageSize = 15): Promise<DriveFileItem[]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,modifiedTime)');
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=${fields}&orderBy=modifiedTime desc&q=trashed=false`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro Google Drive (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function createDriveReportFile(title: string, content: string): Promise<DriveFileItem> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const metadata = {
    name: title,
    mimeType: 'text/plain',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'text/plain' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao criar arquivo no Drive (${res.status})`);
  }

  return await res.json();
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao excluir arquivo (${res.status})`);
  }
}

// ============================================================================
// GOOGLE SHEETS API HELPERS
// ============================================================================
export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: Array<{ sheetId: number; title: string }>;
  spreadsheetUrl?: string;
}

export async function listUserSpreadsheets(): Promise<DriveFileItem[]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,modifiedTime)');
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=15&q=${q}&fields=${fields}&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao listar planilhas (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function getSpreadsheetMetadata(spreadsheetId: string): Promise<SpreadsheetMetadata> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao ler metadados da planilha (${res.status})`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Planilha',
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId || 0,
      title: s.properties?.title || 'Página1',
    })),
  };
}

export async function readSheetValues(spreadsheetId: string, sheetTitle: string): Promise<string[][]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const range = encodeURIComponent(`${sheetTitle}!A1:G25`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao ler células (${res.status})`);
  }

  const data = await res.json();
  return data.values || [];
}

export async function createSalonSpreadsheetWithAppointments(
  title: string,
  rows: string[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao criar planilha (${createRes.status})`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const firstSheetTitle = created.sheets?.[0]?.properties?.title || 'Sheet1';

  const range = encodeURIComponent(`${firstSheetTitle}!A1`);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

// ============================================================================
// GOOGLE TASKS API HELPERS
// ============================================================================
export interface TaskListItem {
  id: string;
  title: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

export async function listTaskLists(): Promise<TaskListItem[]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro Google Tasks (${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function listTasks(taskListId: string): Promise<TaskItem[]> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&maxResults=30`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao listar tarefas (${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createTaskItem(taskListId: string, title: string, notes?: string): Promise<TaskItem> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, notes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao criar tarefa (${res.status})`);
  }

  return await res.json();
}

export async function toggleTaskStatus(
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<TaskItem> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao atualizar tarefa (${res.status})`);
  }

  return await res.json();
}

export async function deleteTaskItem(taskListId: string, taskId: string): Promise<void> {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('Token de acesso indisponível');

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ao excluir tarefa (${res.status})`);
  }
}
