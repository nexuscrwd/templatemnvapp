import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MessageSquare,
  FolderOpen,
  Table,
  CheckSquare,
  RefreshCw,
  Send,
  Trash2,
  Plus,
  ExternalLink,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Chrome,
  Check,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { useTheme } from '../../context/ThemeContext';
import { BookingAppointment } from '../../types';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import {
  initWorkspaceAuth,
  googleWorkspaceSignIn,
  getWorkspaceAccessToken,
  workspaceLogout,
  listGmailMessages,
  sendGmailMessage,
  trashGmailMessage,
  GmailMessageSummary,
  listChatSpaces,
  listChatMessages,
  sendChatMessage,
  ChatSpaceItem,
  ChatMessageItem,
  listDriveFiles,
  createDriveReportFile,
  deleteDriveFile,
  DriveFileItem,
  listUserSpreadsheets,
  getSpreadsheetMetadata,
  readSheetValues,
  createSalonSpreadsheetWithAppointments,
  SpreadsheetMetadata,
  listTaskLists,
  listTasks,
  createTaskItem,
  toggleTaskStatus,
  deleteTaskItem,
  TaskListItem,
  TaskItem,
} from '../../services/googleWorkspaceService';

export interface GoogleWorkspaceHubProps {
  salonName?: string;
  appointments?: BookingAppointment[];
}

type WorkspaceTab = 'gmail' | 'chat' | 'drive' | 'sheets' | 'tasks';

interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm: () => Promise<void>;
}

const GCP_PROJECT_ID = 'project-abe27e04-845c-4302-a79';
const CHAT_CONFIG_CONSOLE_URL = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${GCP_PROJECT_ID}`;

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({
  salonName = 'Meu Estabelecimento',
  appointments = [],
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('gmail');
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Confirmação Obrigatório para Operações Destrutivas / Mutantes
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [isExecutingConfirmation, setIsExecutingConfirmation] = useState<boolean>(false);

  // Estados Gmail
  const [gmailList, setGmailList] = useState<GmailMessageSummary[]>([]);
  const [isLoadingGmail, setIsLoadingGmail] = useState<boolean>(false);
  const [gmailTo, setGmailTo] = useState<string>('');
  const [gmailSubject, setGmailSubject] = useState<string>('');
  const [gmailBody, setGmailBody] = useState<string>('');

  // Estados Google Chat
  const [chatSpaces, setChatSpaces] = useState<ChatSpaceItem[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [newChatText, setNewChatText] = useState<string>('');
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Estados Google Drive
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState<boolean>(false);
  const [newDriveTitle, setNewDriveTitle] = useState<string>('');

  // Estados Google Sheets
  const [spreadsheets, setSpreadsheets] = useState<DriveFileItem[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');
  const [sheetMeta, setSheetMeta] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState<boolean>(false);

  // Estados Google Tasks
  const [taskLists, setTaskLists] = useState<TaskListItem[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackToast({ type, text });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (loggedUser) => {
        setUser(loggedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadActiveTabData = useCallback(async (tab: WorkspaceTab) => {
    const token = await getWorkspaceAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    if (tab === 'gmail') {
      setIsLoadingGmail(true);
      try {
        const items = await listGmailMessages(8);
        setGmailList(items);
      } catch (err: any) {
        showToast('error', err?.message || 'Erro ao carregar Gmail');
      } finally {
        setIsLoadingGmail(false);
      }
    } else if (tab === 'chat') {
      setIsLoadingChat(true);
      setChatError(null);
      try {
        const spaces = await listChatSpaces();
        setChatSpaces(spaces);
        if (spaces.length > 0) {
          const first = spaces[0].name;
          setSelectedSpace(first);
          const msgs = await listChatMessages(first);
          setChatMessages(msgs);
        } else {
          setChatMessages([]);
        }
      } catch (err: any) {
        setChatError(err?.message || 'Erro ao acessar Google Chat');
      } finally {
        setIsLoadingChat(false);
      }
    } else if (tab === 'drive') {
      setIsLoadingDrive(true);
      try {
        const files = await listDriveFiles(12);
        setDriveFiles(files);
      } catch (err: any) {
        showToast('error', err?.message || 'Erro ao carregar Google Drive');
      } finally {
        setIsLoadingDrive(false);
      }
    } else if (tab === 'sheets') {
      setIsLoadingSheets(true);
      try {
        const files = await listUserSpreadsheets();
        setSpreadsheets(files);
        if (files.length > 0 && !selectedSpreadsheetId) {
          const firstId = files[0].id;
          setSelectedSpreadsheetId(firstId);
          const meta = await getSpreadsheetMetadata(firstId);
          setSheetMeta(meta);
          if (meta.sheets.length > 0) {
            const firstTab = meta.sheets[0].title;
            setSelectedSheetTab(firstTab);
            const rows = await readSheetValues(firstId, firstTab);
            setSheetRows(rows);
          }
        }
      } catch (err: any) {
        showToast('error', err?.message || 'Erro ao carregar Google Sheets');
      } finally {
        setIsLoadingSheets(false);
      }
    } else if (tab === 'tasks') {
      setIsLoadingTasks(true);
      try {
        const lists = await listTaskLists();
        setTaskLists(lists);
        if (lists.length > 0) {
          const listId = selectedTaskListId || lists[0].id;
          setSelectedTaskListId(listId);
          const items = await listTasks(listId);
          setTasks(items);
        }
      } catch (err: any) {
        showToast('error', err?.message || 'Erro ao carregar Google Tasks');
      } finally {
        setIsLoadingTasks(false);
      }
    }
  }, [selectedSpreadsheetId, selectedTaskListId]);

  useEffect(() => {
    if (!needsAuth) {
      loadActiveTabData(activeTab);
    }
  }, [needsAuth, activeTab, loadActiveTabData]);

  const handleGoogleSignIn = async () => {
    hapticLight();
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleWorkspaceSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        hapticSuccess();
        showToast('success', 'Conectado ao Google Workspace');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Não foi possível concluir o login com Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    hapticLight();
    await workspaceLogout();
    setUser(null);
    setNeedsAuth(true);
  };

  // Ações com Confirmação Explícita Obrigatória
  const requestSendGmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailTo.trim() || !gmailSubject.trim() || !gmailBody.trim()) return;
    setPendingConfirmation({
      title: 'Enviar E-mail pelo Gmail?',
      description: `Destinatário: ${gmailTo.trim()}\nAssunto: "${gmailSubject.trim()}"`,
      confirmLabel: 'Confirmar Envio',
      onConfirm: async () => {
        await sendGmailMessage(gmailTo.trim(), gmailSubject.trim(), gmailBody.trim());
        setGmailTo('');
        setGmailSubject('');
        setGmailBody('');
        showToast('success', 'E-mail enviado com sucesso');
        await loadActiveTabData('gmail');
      },
    });
  };

  const requestTrashGmail = (msg: GmailMessageSummary) => {
    setPendingConfirmation({
      title: 'Mover e-mail para a lixeira?',
      description: `Assunto: "${msg.subject}"\nDe: ${msg.from}`,
      confirmLabel: 'Mover p/ Lixeira',
      isDanger: true,
      onConfirm: async () => {
        await trashGmailMessage(msg.id);
        setGmailList((prev) => prev.filter((item) => item.id !== msg.id));
        showToast('success', 'E-mail movido para a lixeira');
      },
    });
  };

  const requestSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpace || !newChatText.trim()) return;
    const spaceLabel = chatSpaces.find((s) => s.name === selectedSpace)?.displayName || selectedSpace;
    setPendingConfirmation({
      title: 'Enviar mensagem no Google Chat?',
      description: `Espaço: ${spaceLabel}\nMensagem: "${newChatText.trim()}"`,
      confirmLabel: 'Enviar Mensagem',
      onConfirm: async () => {
        await sendChatMessage(selectedSpace, newChatText.trim());
        setNewChatText('');
        const msgs = await listChatMessages(selectedSpace);
        setChatMessages(msgs);
        showToast('success', 'Mensagem enviada no Google Chat');
      },
    });
  };

  const requestCreateDriveReport = () => {
    const reportName = newDriveTitle.trim() || `Relatorio-${salonName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`;
    const lines = [
      `RELATÓRIO OPERACIONAL — ${salonName}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      `Total de Agendamentos: ${appointments.length}`,
      '----------------------------------------',
      ...appointments.map(
        (a, i) =>
          `${i + 1}. [${a.status || 'CONFIRMADO'}] ${a.dateTime || a.time || ''} — ${a.customerName || 'Cliente'} — ${a.serviceTitle || a.service || 'Serviço'} (${a.price || 'R$ 0'})`
      ),
    ].join('\n');

    setPendingConfirmation({
      title: 'Criar arquivo no Google Drive?',
      description: `Será criado o arquivo "${reportName}" no seu Google Drive com ${appointments.length} agendamento(s).`,
      confirmLabel: 'Criar Arquivo',
      onConfirm: async () => {
        await createDriveReportFile(reportName, lines);
        setNewDriveTitle('');
        showToast('success', 'Relatório salvo no Google Drive');
        await loadActiveTabData('drive');
      },
    });
  };

  const requestDeleteDriveFile = (file: DriveFileItem) => {
    setPendingConfirmation({
      title: 'Excluir arquivo do Google Drive?',
      description: `Deseja excluir permanentemente "${file.name}" do seu Google Drive?`,
      confirmLabel: 'Excluir Arquivo',
      isDanger: true,
      onConfirm: async () => {
        await deleteDriveFile(file.id);
        setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
        showToast('success', 'Arquivo removido do Google Drive');
      },
    });
  };

  const requestExportToSheets = () => {
    const sheetTitle = `Agenda ${salonName} - ${new Date().toLocaleDateString('pt-BR')}`;
    const rows: string[][] = [
      ['Protocolo', 'Cliente', 'Serviço', 'Profissional', 'Data/Hora', 'Status', 'Valor'],
      ...appointments.map((a) => [
        String(a.protocolCode || a.id || '-'),
        String(a.customerName || 'Cliente'),
        String(a.serviceTitle || a.service || 'Serviço'),
        String(a.professionalName || a.professional || '-'),
        String(a.dateTime || a.time || '-'),
        String(a.status || 'CONFIRMADO'),
        String(a.price || 'R$ 0,00'),
      ]),
    ];

    setPendingConfirmation({
      title: 'Exportar Agenda para Google Sheets?',
      description: `Criar planilha "${sheetTitle}" com ${appointments.length} agendamento(s) na sua conta Google Sheets?`,
      confirmLabel: 'Criar Planilha',
      onConfirm: async () => {
        const created = await createSalonSpreadsheetWithAppointments(sheetTitle, rows);
        showToast('success', 'Planilha criada no Google Sheets');
        await loadActiveTabData('sheets');
        setSelectedSpreadsheetId(created.spreadsheetId);
      },
    });
  };

  const handleSelectSpreadsheet = async (spreadsheetId: string) => {
    setSelectedSpreadsheetId(spreadsheetId);
    setIsLoadingSheets(true);
    try {
      const meta = await getSpreadsheetMetadata(spreadsheetId);
      setSheetMeta(meta);
      if (meta.sheets.length > 0) {
        const firstTab = meta.sheets[0].title;
        setSelectedSheetTab(firstTab);
        const rows = await readSheetValues(spreadsheetId, firstTab);
        setSheetRows(rows);
      } else {
        setSheetRows([]);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Erro ao abrir planilha');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleSelectSheetTab = async (tabTitle: string) => {
    if (!selectedSpreadsheetId) return;
    setSelectedSheetTab(tabTitle);
    setIsLoadingSheets(true);
    try {
      const rows = await readSheetValues(selectedSpreadsheetId, tabTitle);
      setSheetRows(rows);
    } catch (err: any) {
      showToast('error', err?.message || 'Erro ao ler aba');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskListId || !newTaskTitle.trim()) return;
    setIsLoadingTasks(true);
    try {
      await createTaskItem(selectedTaskListId, newTaskTitle.trim());
      setNewTaskTitle('');
      const updated = await listTasks(selectedTaskListId);
      setTasks(updated);
      showToast('success', 'Tarefa adicionada');
    } catch (err: any) {
      showToast('error', err?.message || 'Erro ao criar tarefa');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const requestToggleTask = (task: TaskItem) => {
    if (!selectedTaskListId) return;
    const nextCompleted = task.status !== 'completed';
    setPendingConfirmation({
      title: nextCompleted ? 'Concluir tarefa no Google Tasks?' : 'Reabrir tarefa no Google Tasks?',
      description: `Tarefa: "${task.title}"`,
      confirmLabel: nextCompleted ? 'Concluir' : 'Reabrir',
      onConfirm: async () => {
        await toggleTaskStatus(selectedTaskListId, task.id, nextCompleted);
        const updated = await listTasks(selectedTaskListId);
        setTasks(updated);
      },
    });
  };

  const requestDeleteTask = (task: TaskItem) => {
    if (!selectedTaskListId) return;
    setPendingConfirmation({
      title: 'Excluir tarefa do Google Tasks?',
      description: `Deseja excluir a tarefa "${task.title}"?`,
      confirmLabel: 'Excluir Tarefa',
      isDanger: true,
      onConfirm: async () => {
        await deleteTaskItem(selectedTaskListId, task.id);
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        showToast('success', 'Tarefa excluída');
      },
    });
  };

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ElementType }> = [
    { id: 'gmail', label: 'Gmail', icon: Mail },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'drive', label: 'Drive', icon: FolderOpen },
    { id: 'sheets', label: 'Sheets', icon: Table },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  ];

  return (
    <div className="space-y-4">
      {/* TOAST DE FEEDBACK */}
      {feedbackToast && (
        <div
          className={`p-3 rounded-[4px] border flex items-center justify-between gap-2 text-xs font-semibold ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600'
              : isDark
                ? 'bg-rose-950/80 text-rose-200 border-rose-800'
                : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TELA DE LOGIN GOOGLE WORKSPACE QUANDO DESCONECTADO */}
      {needsAuth ? (
        <div className="py-6 px-4 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-[4px] bg-emerald-500 text-white flex items-center justify-center">
            <Chrome className="w-6 h-6 text-white" />
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-bold font-['Poppins']">
              Google Workspace Integrado
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Conecte sua conta para acessar Gmail, Google Chat, Google Drive, Google Sheets e Google Tasks direto no {salonName}.
            </p>
          </div>

          {authError && (
            <div className="p-2.5 rounded-[4px] bg-rose-500/15 text-rose-400 text-xs flex items-center gap-2 max-w-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className={`px-4 py-2.5 rounded-[4px] border font-bold text-xs flex items-center gap-2.5 transition active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100'
                : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
            }`}
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-4 h-4" />
            )}
            <span className="whitespace-nowrap">Sign in with Google</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* BARRA DO USUÁRIO CONECTADO + NAVEGAÇÃO DE SERVIÇOS */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold truncate">
                {user?.email || user?.displayName || 'Conta Google Conectada'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadActiveTabData(activeTab)}
                className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  isDark ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
              >
                <LogOut className="w-3 h-3" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* SELETOR DE ABAS (GMAIL, CHAT, DRIVE, SHEETS, TASKS) */}
          <div className="grid grid-cols-5 gap-1.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setActiveTab(t.id);
                  }}
                  className={`py-2 px-2 rounded-[4px] text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : isDark
                        ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                  <span className={`whitespace-nowrap text-[11px] ${isActive ? 'text-white' : ''}`}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 1. ABA GMAIL */}
          {activeTab === 'gmail' && (
            <div className="space-y-4">
              <form onSubmit={requestSendGmail} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Novo E-mail Rápido
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="email"
                    value={gmailTo}
                    onChange={(e) => setGmailTo(e.target.value)}
                    placeholder="Para (e-mail do cliente)"
                    required
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    value={gmailSubject}
                    onChange={(e) => setGmailSubject(e.target.value)}
                    placeholder="Assunto"
                    required
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gmailBody}
                    onChange={(e) => setGmailBody(e.target.value)}
                    placeholder="Mensagem..."
                    required
                    className={`flex-1 px-3 py-2 rounded-[4px] border text-xs outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span className="text-white whitespace-nowrap">Enviar</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Caixa de Entrada Recente
                </div>
                {isLoadingGmail ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  </div>
                ) : gmailList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">Nenhum e-mail encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {gmailList.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-[4px] flex items-start justify-between gap-3 ${
                          isDark ? 'bg-slate-900' : 'bg-white shadow-xs'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-xs font-bold truncate">{msg.subject}</div>
                          <div className="text-[11px] text-slate-400 truncate">{msg.from}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{msg.snippet}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => requestTrashGmail(msg)}
                          className="p-1.5 rounded-[4px] text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                          title="Mover para lixeira"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. ABA GOOGLE CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-3">
              {/* Aviso de Pré-requisitos do Google Chat API */}
              <div
                className={`p-3 rounded-[4px] text-xs space-y-1.5 ${
                  isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Requisitos Google Chat API</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Requer conta Google Workspace corporativa (Business/Enterprise) e configuração do App em{' '}
                  <a
                    href={CHAT_CONFIG_CONSOLE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-emerald-400 inline-flex items-center gap-1"
                  >
                    <span>Google Cloud Console (Chat API)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  .
                </p>
              </div>

              {chatError && (
                <div className="p-3 rounded-[4px] bg-rose-500/15 text-rose-300 text-xs space-y-1.5">
                  <div className="font-bold">{chatError}</div>
                  <a
                    href={CHAT_CONFIG_CONSOLE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold underline text-emerald-400"
                  >
                    <span>Configurar Google Chat App no Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {isLoadingChat ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {chatSpaces.map((sp) => {
                      const active = selectedSpace === sp.name;
                      return (
                        <button
                          key={sp.name}
                          type="button"
                          onClick={async () => {
                            setSelectedSpace(sp.name);
                            const msgs = await listChatMessages(sp.name);
                            setChatMessages(msgs);
                          }}
                          className={`px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-emerald-500 text-white'
                              : isDark
                                ? 'bg-slate-900 text-slate-300'
                                : 'bg-white text-slate-700'
                          }`}
                        >
                          {sp.displayName}
                        </button>
                      );
                    })}
                  </div>

                  {selectedSpace && (
                    <form onSubmit={requestSendChatMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newChatText}
                        onChange={(e) => setNewChatText(e.target.value)}
                        placeholder="Enviar mensagem no espaço..."
                        className={`flex-1 px-3 py-2 rounded-[4px] border text-xs outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-white" />
                        <span className="text-white whitespace-nowrap">Enviar</span>
                      </button>
                    </form>
                  )}

                  <div className="space-y-1.5">
                    {chatMessages.map((m) => (
                      <div
                        key={m.name}
                        className={`p-2.5 rounded-[4px] text-xs ${
                          isDark ? 'bg-slate-900' : 'bg-white shadow-xs'
                        }`}
                      >
                        <div className="font-bold text-emerald-400 text-[11px]">{m.senderName}</div>
                        <div className="mt-0.5">{m.text}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. ABA GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newDriveTitle}
                  onChange={(e) => setNewDriveTitle(e.target.value)}
                  placeholder="Nome do relatório (opcional)"
                  className={`flex-1 px-3 py-2 rounded-[4px] border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={requestCreateDriveReport}
                  className="px-3.5 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white whitespace-nowrap">Salvar Relatório no Drive</span>
                </button>
              </div>

              {isLoadingDrive ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : driveFiles.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Nenhum arquivo encontrado no Drive.</p>
              ) : (
                <div className="space-y-2">
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-[4px] flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-900' : 'bg-white shadow-xs'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{file.mimeType}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-[4px] text-emerald-400 hover:bg-emerald-500/10"
                            title="Abrir no Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => requestDeleteDriveFile(file)}
                          className="p-1.5 rounded-[4px] text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Excluir arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. ABA GOOGLE SHEETS */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={selectedSpreadsheetId}
                  onChange={(e) => handleSelectSpreadsheet(e.target.value)}
                  className={`flex-1 min-w-[180px] px-3 py-2 rounded-[4px] border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">Selecione uma planilha...</option>
                  {spreadsheets.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={requestExportToSheets}
                  className="px-3.5 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white whitespace-nowrap">Exportar Agenda p/ Sheets</span>
                </button>
              </div>

              {sheetMeta && sheetMeta.sheets.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {sheetMeta.sheets.map((s) => {
                    const active = selectedSheetTab === s.title;
                    return (
                      <button
                        key={s.sheetId}
                        type="button"
                        onClick={() => handleSelectSheetTab(s.title)}
                        className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-emerald-500 text-white'
                            : isDark
                              ? 'bg-slate-900 text-slate-300'
                              : 'bg-white text-slate-700'
                        }`}
                      >
                        {s.title}
                      </button>
                    );
                  })}
                </div>
              )}

              {isLoadingSheets ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : sheetRows.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Sem células preenchidas nesta aba.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <tbody>
                      {sheetRows.slice(0, 12).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            rIdx === 0
                              ? 'font-bold text-emerald-400 border-b border-slate-800'
                              : 'border-b border-slate-800/40'
                          }
                        >
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-1.5 px-2 truncate max-w-[140px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. ABA GOOGLE TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {taskLists.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {taskLists.map((list) => {
                    const active = selectedTaskListId === list.id;
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={async () => {
                          setSelectedTaskListId(list.id);
                          const items = await listTasks(list.id);
                          setTasks(items);
                        }}
                        className={`px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-emerald-500 text-white'
                            : isDark
                              ? 'bg-slate-900 text-slate-300'
                              : 'bg-white text-slate-700'
                        }`}
                      >
                        {list.title}
                      </button>
                    );
                  })}
                </div>
              )}

              <form onSubmit={handleCreateTask} className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Nova tarefa operacional do salão..."
                  className={`flex-1 px-3 py-2 rounded-[4px] border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white whitespace-nowrap">Criar</span>
                </button>
              </form>

              {isLoadingTasks ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Nenhuma tarefa nesta lista.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-[4px] flex items-center justify-between gap-3 ${
                          isDark ? 'bg-slate-900' : 'bg-white shadow-xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => requestToggleTask(task)}
                          className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 ${
                              isDone
                                ? 'bg-emerald-500 text-white'
                                : isDark
                                  ? 'border border-slate-700'
                                  : 'border border-slate-300'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span
                            className={`text-xs truncate ${
                              isDone ? 'line-through text-slate-500' : 'font-semibold'
                            }`}
                          >
                            {task.title}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => requestDeleteTask(task)}
                          className="p-1.5 rounded-[4px] text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO EXPLÍCITA PARA OPERAÇÕES DESTRUTIVAS / MUTANTES */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-[4px] p-4 space-y-4 shadow-xl ${
              isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold font-['Poppins']">{pendingConfirmation.title}</h4>
              <p className="text-xs text-slate-400 whitespace-pre-line">
                {pendingConfirmation.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 z-20">
              <button
                type="button"
                disabled={isExecutingConfirmation}
                onClick={() => setPendingConfirmation(null)}
                className={`px-3 py-2 rounded-[4px] text-xs font-bold cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800'
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isExecutingConfirmation}
                onClick={async () => {
                  setIsExecutingConfirmation(true);
                  try {
                    await pendingConfirmation.onConfirm();
                    setPendingConfirmation(null);
                  } catch (err: any) {
                    showToast('error', err?.message || 'Falha ao executar ação');
                    setPendingConfirmation(null);
                  } finally {
                    setIsExecutingConfirmation(false);
                  }
                }}
                className={`px-3.5 py-2 rounded-[4px] text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  pendingConfirmation.isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {isExecutingConfirmation && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                <span className="text-white whitespace-nowrap">{pendingConfirmation.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
