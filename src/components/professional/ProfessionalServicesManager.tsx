import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Scissors, Check, X, 
  Sparkles, Clock, Image as ImageIcon,
  AlertCircle, Video, Upload, Film, FolderPlus,
  Images, Play, Camera, Eye, Tag
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { hapticLight, hapticSuccess, hapticMedium } from '../../utils/haptics';
import { CatalogServiceItem } from '../../types';
import { ServicePublicAdPreview } from './ServicePublicAdPreview';
import { generateUuidV4, syncAllServicesToDb, uploadSalonMediaToStorage } from '../../lib/supabase';
import { syncSalonMediaToDatabase, fetchSalonMediaFromDatabase, syncSalonServiceToDatabase } from '../../services/mnvSupabaseSync';
import { SERVICE_GALLERY_PRESETS, getGalleryPresetsForCategory } from '../../utils/serviceGalleryPresets';

interface ProfessionalServicesManagerProps {
  services: CatalogServiceItem[];
  onUpdateServices: (services: CatalogServiceItem[]) => void;
  isAddingNewFromQuickAction?: boolean;
  onCloseQuickAction?: () => void;
}

export interface SavedMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  category: string;
  title: string;
  createdAt: number;
  duration?: number;
}

const DEFAULT_CATEGORIES = ['Cabelo', 'Barba', 'Combos', 'Estética', 'Tratamentos', 'Rosto', 'Unhas'];

const INITIAL_SAVED_IMAGES: SavedMediaItem[] = SERVICE_GALLERY_PRESETS.map((p, idx) => ({
  id: p.id,
  type: 'image',
  url: p.url,
  category: p.category,
  title: p.title,
  createdAt: 1700000000000 + idx * 1000,
}));

const INITIAL_SAVED_VIDEOS: SavedMediaItem[] = [];

// Funções utilitárias para máscara e conversão monetária BRL (edição livre de dígitos)
function formatCurrencyBRL(val: number | string): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrencyBRL(formattedVal: string): number {
  const cleaned = formattedVal.replace(/\D/g, '');
  if (!cleaned) return 0;
  return Number(cleaned) / 100;
}

function maskCurrencyBRLInput(rawValue: string): string {
  const digitsOnly = rawValue.replace(/\D/g, '');
  if (!digitsOnly) return '0,00';
  const val = Number(digitsOnly) / 100;
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Funções utilitárias para duração estruturada em HH e MM
function parseDurationToHoursMinutes(durationStr?: string): { hours: string; minutes: string } {
  if (!durationStr) return { hours: '00', minutes: '40' };
  
  const str = durationStr.toLowerCase().trim();
  let totalMinutes = 0;

  if (str.includes('h')) {
    const parts = str.split('h');
    const hNum = parseInt(parts[0].replace(/\D/g, '')) || 0;
    let mNum = 0;
    if (parts[1]) {
      mNum = parseInt(parts[1].replace(/\D/g, '')) || 0;
    }
    totalMinutes = hNum * 60 + mNum;
  } else {
    totalMinutes = parseInt(str.replace(/\D/g, '')) || 0;
  }

  if (totalMinutes <= 0) totalMinutes = 40;

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return {
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
  };
}

function formatHoursMinutesToDuration(hoursStr: string, minutesStr: string): string {
  const h = Math.max(0, Math.min(23, parseInt(hoursStr) || 0));
  const m = Math.max(0, Math.min(59, parseInt(minutesStr) || 0));
  
  const totalMin = h * 60 + m;
  if (totalMin === 0) return '15 min';

  if (h > 0 && m > 0) {
    return `${h}h ${m}min`;
  } else if (h > 0) {
    return `${h}h`;
  } else {
    return `${m} min`;
  }
}

export const ProfessionalServicesManager: React.FC<ProfessionalServicesManagerProps> = ({
  services,
  onUpdateServices,
  isAddingNewFromQuickAction = false,
  onCloseQuickAction,
}) => {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Categorias cadastradas com sincronização em LocalStorage
  const [categoryList, setCategoryList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vagou_custom_service_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const fromServices = services.map((s) => s.category?.trim()).filter(Boolean);
          return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed, ...fromServices]));
        }
      }
    } catch {
      // ignore
    }
    const fromServices = services.map((s) => s.category?.trim()).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromServices]));
  });

  // Modal de Adicionar / Editar Serviço (Passo a Passo)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(isAddingNewFromQuickAction);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  // Controle de criação rápida de categoria dentro do fluxo de criação do serviço
  const [isCreatingCategoryInline, setIsCreatingCategoryInline] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Pré-visualização do anúncio no portal / modo público
  const [previewService, setPreviewService] = useState<CatalogServiceItem | null>(null);

  // Campos do formulário básico
  const [formCategory, setFormCategory] = useState<string>('Cabelo');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('50,00');
  const [formHours, setFormHours] = useState<string>('00');
  const [formMinutes, setFormMinutes] = useState<string>('40');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPhotoCover, setFormPhotoCover] = useState<string>('');
  const minutesInputRef = useRef<HTMLInputElement | null>(null);

  // -------------------------------------------------------------
  // GERENCIADOR DE MÍDIA DESACOPLADO (POR SERVIÇO)
  // -------------------------------------------------------------
  const [mediaModalService, setMediaModalService] = useState<CatalogServiceItem | null>(null);
  const [mediaDisplayMode, setMediaDisplayMode] = useState<'static' | 'slideshow' | 'video'>('static');
  const [mediaPhotos, setMediaPhotos] = useState<string[]>([]);
  const [mediaVideoUrl, setMediaVideoUrl] = useState<string>('');
  const [mediaVideoDuration, setMediaVideoDuration] = useState<number>(5);
  const [videoDurationWarning, setVideoDurationWarning] = useState<string | null>(null);

  // Biblioteca de Mídias Salvas com persistência no LocalStorage e hidratação do Supabase (salon_media_items)
  const [savedMediaList, setSavedMediaList] = useState<SavedMediaItem[]>(() => {
    try {
      const stored = localStorage.getItem('vagou_saved_media_library_v3') || localStorage.getItem('vagou_salon_media');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [...INITIAL_SAVED_IMAGES, ...INITIAL_SAVED_VIDEOS];
  });

  useEffect(() => {
    const salonId = localStorage.getItem('vagou_salon_db_id') || '';
    if (!salonId) return;
    let isMounted = true;
    fetchSalonMediaFromDatabase(salonId).then((remoteItems) => {
      if (!isMounted || !Array.isArray(remoteItems) || remoteItems.length === 0) return;
      setSavedMediaList((prev) => {
        const existingUrls = new Set(prev.map((m) => m.url));
        const mappedRemote: SavedMediaItem[] = remoteItems
          .filter((r: any) => r.url && !existingUrls.has(r.url))
          .map((r: any) => ({
            id: r.id || generateUuidV4(),
            type: r.type === 'video' ? 'video' : 'image',
            url: r.url,
            category: r.category || 'Geral',
            title: r.title || 'Mídia do Salão',
            createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
            duration: r.duration_seconds || 5,
          }));
        if (mappedRemote.length === 0) return prev;
        const merged = [...mappedRemote, ...prev];
        try {
          localStorage.setItem('vagou_saved_media_library_v3', JSON.stringify(merged.slice(0, 50)));
          localStorage.setItem('vagou_salon_media', JSON.stringify(merged.slice(0, 50)));
        } catch {}
        return merged;
      });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Modal dedicado para seleção da Biblioteca de Mídias Salvas
  const [isMediaLibraryModalOpen, setIsMediaLibraryModalOpen] = useState<boolean>(false);
  const [mediaLibraryCategory, setMediaLibraryCategory] = useState<string>('Todas');

  const availableLibraryCategories = useMemo(() => {
    const cats = new Set<string>();
    categoryList.forEach((c) => cats.add(c));
    savedMediaList.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return ['Todas', ...Array.from(cats)];
  }, [savedMediaList, categoryList]);

  const filteredSavedImages = useMemo(() => {
    return savedMediaList.filter((m) => {
      if (m.type !== 'image') return false;
      if (mediaLibraryCategory === 'Todas') return true;
      return m.category.toLowerCase() === mediaLibraryCategory.toLowerCase();
    });
  }, [savedMediaList, mediaLibraryCategory]);

  const filteredSavedVideos = useMemo(() => {
    return savedMediaList.filter((m) => {
      if (m.type !== 'video') return false;
      if (mediaLibraryCategory === 'Todas') return true;
      return m.category.toLowerCase() === mediaLibraryCategory.toLowerCase();
    });
  }, [savedMediaList, mediaLibraryCategory]);
  
  // Referências para inputs de Câmera e Dispositivo
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const devicePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement | null>(null);
  const deviceVideoInputRef = useRef<HTMLInputElement | null>(null);
  
  const [deleteConfirmService, setDeleteConfirmService] = useState<CatalogServiceItem | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<string | null>(null);
  const [isChooseCreateModalOpen, setIsChooseCreateModalOpen] = useState<boolean>(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryModalName, setNewCategoryModalName] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleDeleteCategory = (catName: string) => {
    hapticMedium();
    const updatedCats = categoryList.filter((c) => c.toLowerCase() !== catName.toLowerCase());
    persistCategories(updatedCats);

    const updatedServices = services.map((s) => {
      if (s.category?.toLowerCase() === catName.toLowerCase()) {
        return { ...s, category: 'Outros' };
      }
      return s;
    });
    onUpdateServices(updatedServices);

    if (selectedCategory.toLowerCase() === catName.toLowerCase()) {
      setSelectedCategory('Todos');
    }

    setDeleteConfirmCategory(null);
    showToast(`Categoria "${catName}" excluída.`);
  };

  const handleCreateCategoryFromModal = () => {
    const target = newCategoryModalName.trim();
    if (!target) return;

    if (categoryList.some((c) => c.toLowerCase() === target.toLowerCase())) {
      showToast(`Categoria "${target}" já existe!`);
      return;
    }

    const updated = [...categoryList, target];
    persistCategories(updated);
    setNewCategoryModalName('');
    setIsNewCategoryModalOpen(false);
    hapticSuccess();
    showToast(`Categoria "${target}" criada com sucesso!`);
  };

  // Salvar categorias no LocalStorage
  const persistCategories = (newCats: string[]) => {
    setCategoryList(newCats);
    try {
      localStorage.setItem('vagou_custom_service_categories', JSON.stringify(newCats));
    } catch {
      // ignore
    }
  };

  // Criar nova categoria dentro do fluxo de cadastro
  const handleCreateCategory = (nameToCreate?: string) => {
    const target = (nameToCreate || newCategoryName).trim();
    if (!target) return;

    if (categoryList.some((c) => c.toLowerCase() === target.toLowerCase())) {
      showToast(`Categoria "${target}" já existe!`);
      setFormCategory(target);
      setIsCreatingCategoryInline(false);
      setNewCategoryName('');
      return;
    }

    const updated = [...categoryList, target];
    persistCategories(updated);
    setFormCategory(target);
    setNewCategoryName('');
    setIsCreatingCategoryInline(false);
    hapticSuccess();
    showToast(`Categoria "${target}" criada com sucesso!`);
  };

  // Abrir modal para novo serviço (fluxo passo a passo)
  const handleOpenNew = (defaultCat?: string) => {
    hapticLight();
    setEditingServiceId(null);
    setFormCategory(defaultCat && defaultCat !== 'Todos' ? defaultCat : (categoryList[0] || 'Cabelo'));
    setFormTitle('');
    setFormPrice('50,00');
    setFormHours('00');
    setFormMinutes('40');
    setFormDescription('');
    setFormPhotoCover('');
    setIsCreatingCategoryInline(false);
    setNewCategoryName('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar serviço
  const handleOpenEdit = (srv: CatalogServiceItem) => {
    hapticLight();
    setEditingServiceId(srv.id);
    setFormCategory(srv.category || categoryList[0] || 'Cabelo');
    setFormTitle(srv.title);
    setFormPrice(formatCurrencyBRL(srv.price));
    const parsedDur = parseDurationToHoursMinutes(srv.duration);
    setFormHours(parsedDur.hours);
    setFormMinutes(parsedDur.minutes);
    setFormDescription(srv.description || '');
    setFormPhotoCover(srv.photos?.[0] || srv.image || '');
    setIsCreatingCategoryInline(false);
    setNewCategoryName('');
    setIsModalOpen(true);
  };

  // Salvar serviço (novo ou existente com dados básicos)
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedPrice = parseCurrencyBRL(formPrice);
    const calculatedDuration = formatHoursMinutesToDuration(formHours, formMinutes);

    const salonId = localStorage.getItem('vagou_salon_db_id') || localStorage.getItem('vagou_salon_slug') || '';

    if (editingServiceId) {
      // Editar serviço existente preservando mídias já cadastradas ou atualizando capa
      const updated = services.map((s) => {
        if (s.id === editingServiceId) {
          const existingPhotos = Array.isArray(s.photos) && s.photos.length > 0 ? s.photos : [];
          let finalPhotos = existingPhotos;
          if (formPhotoCover) {
            if (!existingPhotos.includes(formPhotoCover)) {
              finalPhotos = [formPhotoCover, ...existingPhotos].slice(0, 5);
            } else if (existingPhotos[0] !== formPhotoCover) {
              finalPhotos = [formPhotoCover, ...existingPhotos.filter((p) => p !== formPhotoCover)].slice(0, 5);
            }
          }
          return {
            ...s,
            title: formTitle.trim(),
            price: parsedPrice,
            duration: calculatedDuration,
            category: formCategory,
            description: formDescription.trim(),
            image: formPhotoCover || s.image || finalPhotos[0],
            photos: finalPhotos,
          };
        }
        return s;
      });
      onUpdateServices(updated);
      window.dispatchEvent(new CustomEvent('vagou:catalog-updated', { detail: updated }));

      const targetService = updated.find((s) => s.id === editingServiceId);
      if (targetService && salonId) {
        syncSalonServiceToDatabase(salonId, {
          id: targetService.id,
          name: targetService.title,
          category: targetService.category,
          price: targetService.price,
          durationMinutes: parseInt(targetService.duration?.replace(/\D/g, '') || '40') || 40,
          description: targetService.description,
          photos: targetService.photos,
          slides: targetService.photos,
          isActive: true,
        }).catch((err) => console.warn('Aviso: Sincronização individual do serviço:', err));
        syncAllServicesToDb(salonId, updated).catch((err) => console.warn('Aviso: Sincronização global do catálogo:', err));
      }

      hapticSuccess();
      showToast('Serviço atualizado com sucesso no banco!');
    } else {
      // Criar novo serviço com UUID v4 nativo (compatível 100% com public.services do Supabase)
      const newService: CatalogServiceItem = {
        id: generateUuidV4(),
        title: formTitle.trim(),
        price: parsedPrice,
        duration: calculatedDuration,
        category: formCategory,
        description: formDescription.trim(),
        image: formPhotoCover || undefined,
        photos: formPhotoCover ? [formPhotoCover] : [],
        displayMode: 'static',
        aspectRatio: 'aspect-square',
      };
      const updated = [newService, ...services];
      onUpdateServices(updated);
      window.dispatchEvent(new CustomEvent('vagou:catalog-updated', { detail: updated }));

      if (salonId) {
        syncSalonServiceToDatabase(salonId, {
          id: newService.id,
          name: newService.title,
          category: newService.category,
          price: newService.price,
          durationMinutes: parseInt(newService.duration?.replace(/\D/g, '') || '40') || 40,
          description: newService.description,
          photos: newService.photos,
          slides: newService.photos,
          isActive: true,
        }).catch((err) => console.warn('Aviso: Sincronização individual do novo serviço:', err));
        syncAllServicesToDb(salonId, updated).catch((err) => console.warn('Aviso: Sincronização global do catálogo:', err));
      }

      hapticSuccess();
      showToast('Serviço criado e persistido no banco de dados!');
    }

    setIsModalOpen(false);
    onCloseQuickAction?.();
  };

  // Abrir gerenciador de mídia dedicado para um serviço específico
  const handleOpenMediaManager = (srv: CatalogServiceItem) => {
    hapticLight();
    setMediaModalService(srv);
    
    // Configurar modo de exibição
    const currentMode = srv.displayMode || (srv.mediaType === 'video' || srv.videoUrl ? 'video' : 'static');
    setMediaDisplayMode(currentMode);
    
    // Fotos
    if (srv.photos && Array.isArray(srv.photos) && srv.photos.length > 0) {
      setMediaPhotos([...srv.photos.slice(0, 5)]);
    } else if (srv.image) {
      setMediaPhotos([srv.image]);
    } else {
      setMediaPhotos([]);
    }

    // Vídeo
    if (srv.videoUrl) {
      setMediaVideoUrl(srv.videoUrl);
      setMediaVideoDuration(srv.videoDurationSeconds || 5);
    } else {
      setMediaVideoUrl('');
      setMediaVideoDuration(5);
    }

    setVideoDurationWarning(null);
  };

  // Salvar mídia no serviço selecionado
  const handleSaveMediaToService = () => {
    if (!mediaModalService) return;

    const primaryPhoto = mediaPhotos[0] || (mediaDisplayMode === 'video' ? undefined : INITIAL_SAVED_IMAGES[0].url);
    const finalPhotos = mediaPhotos.length > 0 ? mediaPhotos : (primaryPhoto ? [primaryPhoto] : []);
    const finalMediaType: 'image' | 'video' = mediaDisplayMode === 'video' ? 'video' : 'image';

    const updated = services.map((s) => {
      if (s.id === mediaModalService.id) {
        return {
          ...s,
          image: primaryPhoto,
          photos: finalPhotos,
          mediaType: finalMediaType,
          displayMode: mediaDisplayMode,
          videoUrl: mediaDisplayMode === 'video' ? mediaVideoUrl : undefined,
          videoDurationSeconds: mediaDisplayMode === 'video' ? mediaVideoDuration : undefined,
        };
      }
      return s;
    });

    onUpdateServices(updated);

    const salonId = localStorage.getItem('vagou_salon_db_id') || localStorage.getItem('vagou_salon_slug') || '';
    if (salonId) {
      const srvItem = updated.find((s) => s.id === mediaModalService.id);
      if (srvItem) {
        syncSalonServiceToDatabase(salonId, {
          id: srvItem.id,
          name: srvItem.title,
          category: srvItem.category,
          price: srvItem.price,
          durationMinutes: parseInt(srvItem.duration?.replace(/\D/g, '') || '40') || 40,
          description: srvItem.description,
          photos: srvItem.photos,
          slides: srvItem.photos,
          videos: srvItem.videoUrl ? [{ id: `vid_${srvItem.id}`, url: srvItem.videoUrl, title: srvItem.title, duration_seconds: srvItem.videoDurationSeconds || 5 }] : [],
          isActive: true,
        }).catch(() => {});
      }
      syncAllServicesToDb(salonId, updated).catch(() => {});
    }

    hapticSuccess();
    showToast('Mídia do serviço atualizada no banco com sucesso!');
    setMediaModalService(null);
  };

  // Processar arquivo de foto/vídeo capturado na hora ou enviado do aparelho
  const processAndSaveMediaFile = async (
    file: File,
    type: 'image' | 'video',
    targetMode: 'static' | 'slideshow' | 'video'
  ) => {
    const currentCat = mediaModalService?.category || formCategory || 'Cabelo';
    const currentTitle = mediaModalService?.title || formTitle || 'Serviço';
    const salonId = localStorage.getItem('vagou_salon_db_id') || '';

    // Tentativa prioritária: Upload direto no bucket do Supabase Storage
    try {
      const uploadedUrl = await uploadSalonMediaToStorage(file, 'salon-media', 'services');
      if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
        const newMedia: SavedMediaItem = {
          id: generateUuidV4(),
          type,
          url: uploadedUrl,
          category: currentCat,
          title: `${currentTitle.trim()} (${currentCat})`,
          createdAt: Date.now(),
          duration: type === 'video' ? 5 : undefined,
        };

        setSavedMediaList((prev) => {
          const updated = [newMedia, ...prev];
          try {
            localStorage.setItem('vagou_saved_media_library_v3', JSON.stringify(updated.slice(0, 50)));
            localStorage.setItem('vagou_salon_media', JSON.stringify(updated.slice(0, 50)));
          } catch {}
          return updated;
        });

        if (salonId) {
          syncSalonMediaToDatabase(salonId, {
            id: newMedia.id,
            title: newMedia.title,
            url: newMedia.url,
            type,
            media_group: type === 'video' ? 'videos' : 'fotos',
            category: 'servicos',
          });
        }

        if (type === 'video' || targetMode === 'video') {
          setMediaVideoUrl(uploadedUrl);
          setMediaDisplayMode('video');
        } else if (targetMode === 'static') {
          setMediaPhotos([uploadedUrl]);
          setFormPhotoCover(uploadedUrl);
        } else {
          setMediaPhotos((prev) => [...prev.slice(0, 4), uploadedUrl]);
        }

        hapticSuccess();
        showToast('Mídia enviada para o Storage com sucesso!');
        return;
      }
    } catch {
      // Fallback para compressão local em canvas
    }

    if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione um arquivo de imagem válido.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        if (!rawUrl) return;

        // Otimizar resolução de imagens grandes
        const img = new Image();
        img.onload = () => {
          let finalUrl = rawUrl;
          const maxDim = 1200;
          if (img.width > maxDim || img.height > maxDim) {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxDim / img.width, maxDim / img.height);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              finalUrl = canvas.toDataURL('image/jpeg', 0.85);
            }
          }

          const newMedia: SavedMediaItem = {
            id: generateUuidV4(),
            type: 'image',
            url: finalUrl,
            category: currentCat,
            title: `${currentTitle.trim()} (${currentCat})`,
            createdAt: Date.now(),
          };

          setSavedMediaList((prev) => {
            const updated = [newMedia, ...prev];
            try {
              localStorage.setItem('vagou_saved_media_library_v3', JSON.stringify(updated.slice(0, 50)));
              localStorage.setItem('vagou_salon_media', JSON.stringify(updated.slice(0, 50)));
            } catch {
              // ignore
            }
            return updated;
          });

          const salonId = localStorage.getItem('vagou_salon_db_id') || '';
          if (salonId) {
            syncSalonMediaToDatabase(salonId, {
              id: newMedia.id,
              title: newMedia.title,
              url: newMedia.url,
              type: 'image',
              media_group: 'fotos',
              category: 'servicos',
            });
          }

          if (targetMode === 'static') {
            setMediaPhotos([finalUrl]);
            setFormPhotoCover(finalUrl);
            hapticSuccess();
            showToast(`Foto salva e definida para o serviço!`);
          } else {
            // slideshow: adicionar até 5 fotos
            if (mediaPhotos.length >= 5) {
              hapticLight();
              showToast(`Foto salva na biblioteca. (Slide atingiu limite de 5 fotos)`);
            } else {
              setMediaPhotos((prev) => [...prev, finalUrl]);
              hapticSuccess();
              showToast(`Foto salva e adicionada ao slide (${mediaPhotos.length + 1}/5)!`);
            }
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    } else {
      // Vídeo
      if (!file.type.startsWith('video/')) {
        showToast('Por favor, selecione um arquivo de vídeo válido.');
        return;
      }
      const videoBlobUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = videoBlobUrl;
      tempVideo.onloadedmetadata = () => {
        const dur = Math.round(tempVideo.duration * 10) / 10;
        setMediaVideoDuration(dur);
        if (dur > 5.5) {
          setVideoDurationWarning(`Vídeo de ${dur}s. O radar prioriza vídeos de até 5 segundos para máxima conversão.`);
        } else {
          setVideoDurationWarning(null);
        }
      };

      const newMedia: SavedMediaItem = {
        id: generateUuidV4(),
        type: 'video',
        url: videoBlobUrl,
        category: currentCat,
        title: `${currentTitle.trim()} (${currentCat})`,
        createdAt: Date.now(),
        duration: 5,
      };

      setSavedMediaList((prev) => {
        const updated = [newMedia, ...prev];
        try {
          localStorage.setItem('vagou_saved_media_library_v3', JSON.stringify(updated.slice(0, 30)));
          localStorage.setItem('vagou_salon_media', JSON.stringify(updated.slice(0, 30)));
        } catch {
          // ignore
        }
        return updated;
      });

      const salonId = localStorage.getItem('vagou_salon_db_id') || '';
      if (salonId) {
        syncSalonMediaToDatabase(salonId, {
          id: newMedia.id,
          title: newMedia.title,
          url: newMedia.url,
          type: 'video',
          media_group: 'videos',
          category: 'servicos',
          duration_seconds: 5,
        });
      }

      setMediaVideoUrl(videoBlobUrl);
      setMediaDisplayMode('video');
      hapticSuccess();
      showToast(`Vídeo salvo na biblioteca e selecionado!`);
    }
  };

  // Remover foto do slide no gerenciador de mídia
  const handleRemovePhotoFromSlide = (index: number) => {
    setMediaPhotos((prev) => prev.filter((_, i) => i !== index));
    hapticLight();
  };

  // Excluir serviço (confirmado via modal)
  const handleDeleteService = (id: string) => {
    hapticMedium();
    const updated = services.filter((s) => s.id !== id);
    onUpdateServices(updated);
    window.dispatchEvent(new CustomEvent('vagou:catalog-updated', { detail: updated }));
    setDeleteConfirmService(null);
    showToast('Serviço removido do catálogo.');

    const salonId = localStorage.getItem('vagou_salon_db_id') || localStorage.getItem('vagou_salon_slug') || '';
    if (salonId) {
      syncAllServicesToDb(salonId, updated).catch(() => {});
    }
  };

  // Filtragem de serviços por categoria
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      return selectedCategory === 'Todos' || srv.category?.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [services, selectedCategory]);

  // Agrupamento por Categoria (Categoria como Grupo Pai e Serviços como Subcategorias)
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, CatalogServiceItem[]> = {};
    filteredServices.forEach((srv) => {
      const cat = srv.category?.trim() || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(srv);
    });
    return groups;
  }, [filteredServices]);

  const allAvailableCategories = useMemo(() => {
    return ['Todos', ...categoryList];
  }, [categoryList]);

  return (
    <div className="w-full h-full flex flex-col justify-start overflow-hidden relative">
      {/* Inputs Ocultos de Câmera e Arquivos para Mídia */}
      <input
        type="file"
        ref={cameraPhotoInputRef}
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processAndSaveMediaFile(e.target.files[0], 'image', mediaDisplayMode);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={devicePhotoInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processAndSaveMediaFile(e.target.files[0], 'image', mediaDisplayMode);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraVideoInputRef}
        accept="video/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processAndSaveMediaFile(e.target.files[0], 'video', 'video');
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={deviceVideoInputRef}
        accept="video/mp4,video/webm,video/quicktime"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processAndSaveMediaFile(e.target.files[0], 'video', 'video');
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded bg-emerald-500 text-white font-bold text-xs shadow-lg animate-in fade-in flex items-center gap-1.5 whitespace-nowrap">
          <Check className="w-4 h-4 text-white stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOPO LIMPO: BOTÃO ÚNICO DE NOVO SERVIÇO & CHIPS DE CATEGORIAS */}
      <div className={`p-3 border-b transition-colors shrink-0 space-y-2.5 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xs font-black uppercase tracking-wider font-['Poppins'] flex items-center gap-1.5 text-emerald-400">
              <Scissors className="w-4 h-4 text-emerald-400" />
              <span>Categorias & Serviços</span>
            </h2>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
              {services.length} {services.length === 1 ? 'serviço ativo' : 'serviços ativos'}
            </p>
          </div>

          {/* Botão ÚNICO Primário de Ação: Novo */}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setIsChooseCreateModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10.5px] uppercase tracking-wider transition shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            <span>Novo</span>
          </button>
        </div>

        {/* Chips de Categorias Roláveis */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {allAvailableCategories.map((cat) => {
            const count = cat === 'Todos' ? services.length : services.filter((s) => s.category?.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  hapticLight();
                  setSelectedCategory(cat);
                }}
                className={`py-1 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded-full ${
                  isSelected ? 'bg-emerald-600 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LISTA DE SERVIÇOS (LAYOUT PLANO ORGANIZADO POR CATEGORIA) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <Scissors className={`w-8 h-8 mx-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {services.length === 0 ? 'Não há serviço ainda cadastrado' : `Nenhum serviço encontrado em "${selectedCategory}"`}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Cadastre seus serviços para que os clientes possam visualizar e agendar atendimentos.
            </p>
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => handleOpenNew(selectedCategory)}
                className="px-4 py-2 rounded bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                <span>+ Criar Serviço</span>
              </button>
            </div>
          </div>
        ) : (
          (Object.entries(groupedByCategory) as [string, CatalogServiceItem[]][]).map(([categoryName, catServices]) => (
            <div key={categoryName} className="space-y-2">
              {/* Header da Categoria Mestre */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 rounded-full bg-emerald-500 shadow-xs" />
                  <h3 className={`text-xs font-black uppercase tracking-wider font-['Poppins'] ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {categoryName}
                  </h3>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                    isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {catServices.length} {catServices.length === 1 ? 'serviço' : 'serviços'}
                  </span>
                </div>

                {/* Botão de Excluir Categoria (apenas para categorias cadastradas na lista e que não sejam o Fallback "Outros") */}
                {categoryList.includes(categoryName) && categoryName.toLowerCase() !== 'outros' && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticMedium();
                      setDeleteConfirmCategory(categoryName);
                    }}
                    className="px-2 py-1 rounded hover:bg-rose-500/10 text-rose-400 border border-transparent hover:border-rose-500/20 transition cursor-pointer flex items-center gap-1 active:scale-95"
                    title={`Excluir categoria ${categoryName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[9.5px] font-bold uppercase tracking-wide">Excluir</span>
                  </button>
                )}
              </div>

              {/* Grid de Serviços */}
              <div className="grid grid-cols-1 gap-2">
                {catServices.map((srv) => {
                  const srvMode = srv.displayMode || (srv.mediaType === 'video' ? 'video' : 'static');
                  const photoCount = srv.photos?.length || (srv.image ? 1 : 0);
                  const isVideoMode = srvMode === 'video' && !!srv.videoUrl;
                  const isSlideshowMode = srvMode === 'slideshow' && photoCount > 0;
                  const hasMedia = Boolean(isVideoMode || photoCount > 0);

                  return (
                    <div
                      key={srv.id}
                      className={`p-2.5 rounded transition flex items-center justify-between gap-3 border ${
                        isDark 
                          ? 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Miniatura do Anúncio ou Botão de Inserção de Mídia */}
                      <div 
                        onClick={() => handleOpenMediaManager(srv)}
                        className="w-14 h-14 rounded overflow-hidden relative shrink-0 bg-slate-950 border border-slate-800 cursor-pointer group"
                        title={hasMedia ? "Alterar foto ou vídeo" : "Inserir foto ou vídeo"}
                      >
                        {isVideoMode ? (
                          <>
                            <video
                              src={srv.videoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 right-1 px-1 py-0.2 rounded bg-slate-950/90 border border-emerald-500/40 text-emerald-400 text-[8px] font-black flex items-center gap-0.5 shadow-xs">
                              <Video className="w-2 h-2 text-emerald-400" />
                              <span>5s</span>
                            </div>
                          </>
                        ) : photoCount > 0 ? (
                          <>
                            <img
                              src={srv.image || (srv.photos && srv.photos[0])}
                              alt={srv.title}
                              className="w-full h-full object-cover"
                            />
                            {isSlideshowMode && photoCount > 1 && (
                              <div className="absolute top-1 right-1 px-1 py-0.2 rounded bg-slate-950/90 border border-emerald-500/40 text-emerald-400 text-[8px] font-black flex items-center gap-0.5 shadow-xs">
                                <Images className="w-2 h-2 text-emerald-400" />
                                <span>{photoCount}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Estado Sem Mídia: Ícone chamativo para inserção */
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 border border-dashed border-emerald-500/40 text-emerald-400 group-hover:bg-emerald-500/10 transition p-1">
                            <Camera className="w-4 h-4 text-emerald-400" />
                            <span className="text-[7.5px] font-bold text-emerald-400 mt-0.5 text-center leading-tight">
                              + Mídia
                            </span>
                          </div>
                        )}

                        {/* Overlay sutil de edição ao passar o mouse */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      {/* Informações Centrais (clique para editar) */}
                      <div 
                        onClick={() => handleOpenEdit(srv)}
                        className="min-w-0 flex-1 space-y-1 cursor-pointer group/info"
                        title="Clique para editar serviço"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`text-xs font-bold truncate group-hover/info:text-emerald-400 transition ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {srv.title}
                          </h4>
                          
                          {/* Badge do Modo de Publicação */}
                          {isVideoMode ? (
                            <span className="shrink-0 px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold flex items-center gap-0.5">
                              <Film className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Vídeo 5s</span>
                            </span>
                          ) : isSlideshowMode && photoCount > 1 ? (
                            <span className="shrink-0 px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold flex items-center gap-0.5">
                              <Images className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Slide ({photoCount})</span>
                            </span>
                          ) : photoCount > 0 ? (
                            <span className="shrink-0 px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-semibold flex items-center gap-0.5">
                              <ImageIcon className="w-2.5 h-2.5 text-slate-400" />
                              <span>Foto</span>
                            </span>
                          ) : (
                            <span className="shrink-0 px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[8.5px] font-bold">
                              Sem mídia
                            </span>
                          )}
                        </div>

                        {srv.description && (
                          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} line-clamp-1`}>
                            {srv.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="font-black text-emerald-400 text-xs">
                            R$ {srv.price.toFixed(0)}
                          </span>
                          <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>•</span>
                          <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Clock className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{srv.duration}</span>
                          </span>
                        </div>
                      </div>

                      {/* Botão de Exclusão Rápida do Serviço */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticMedium();
                          setDeleteConfirmService(srv);
                        }}
                        className="p-2 rounded hover:bg-rose-500/10 text-rose-400 border border-transparent hover:border-rose-500/20 transition cursor-pointer active:scale-95 shrink-0"
                        title="Excluir este serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: FLUXO PASSO A PASSO PARA NOVO / EDITAR SERVIÇO */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className={`w-full max-w-md max-h-[92vh] rounded-lg flex flex-col overflow-hidden shadow-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                  {editingServiceId ? 'Editar Serviço' : 'Novo Serviço'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário com Foco Passo a Passo */}
            <form onSubmit={handleSaveService} className="p-4 space-y-3.5 overflow-y-auto no-scrollbar flex-1">
              {/* 1. SELEÇÃO OU CRIAÇÃO DE CATEGORIA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    1. Categoria do Serviço *
                  </label>
                  {!isCreatingCategoryInline && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setIsCreatingCategoryInline(true);
                      }}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      <FolderPlus className="w-3 h-3 text-emerald-400" />
                      <span>+ Criar Categoria</span>
                    </button>
                  )}
                </div>

                {/* Bloco inline de criação de categoria rápida */}
                {isCreatingCategoryInline ? (
                  <div className={`p-2.5 rounded border space-y-2 ${isDark ? 'bg-slate-900/80 border-emerald-500/40' : 'bg-emerald-50/60 border-emerald-200'}`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da nova categoria..."
                        className={`flex-1 px-2.5 py-1.5 rounded text-xs border outline-hidden ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateCategory()}
                        disabled={!newCategoryName.trim()}
                        className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Criar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingCategoryInline(false)}
                        className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-28 overflow-y-auto no-scrollbar p-0.5">
                    {categoryList.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormCategory(cat)}
                        className={`py-1.5 px-2 rounded text-[11px] font-bold transition cursor-pointer text-center truncate ${
                          formCategory === cat
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : isDark
                            ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-slate-100 border border-slate-200 text-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. NOME DO SERVIÇO */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  2. Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Corte Degradê, Alinhamento de Fios, etc."
                  className={`w-full px-3 py-2 rounded text-xs border ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } outline-hidden`}
                />
              </div>

              {/* 3. PREÇO E DURAÇÃO */}
              <div className="flex flex-row items-start gap-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    3. Preço (R$) *
                  </label>
                  <div className="relative max-w-[90px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                      R$
                    </span>
                    <input
                      id="service-price-input"
                      type="text"
                      inputMode="numeric"
                      required
                      value={formPrice}
                      onChange={(e) => {
                        const masked = maskCurrencyBRLInput(e.target.value);
                        setFormPrice(masked);
                      }}
                      placeholder="0,00"
                      className={`w-full pl-8 pr-3 py-2 rounded text-xs font-bold border ${
                        isDark 
                          ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                      } outline-hidden`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    4. Duração Estimada *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {/* Bloco de Horas */}
                    <div className={`flex items-center px-2 py-1.5 rounded border transition ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 focus-within:border-emerald-500' 
                        : 'bg-slate-50 border-slate-200 focus-within:border-emerald-500'
                    }`}>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={formHours}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                          setFormHours(digits);
                          if (digits.length === 2 && minutesInputRef.current) {
                            minutesInputRef.current.focus();
                            minutesInputRef.current.select();
                          }
                        }}
                        onBlur={() => {
                          if (!formHours) {
                            setFormHours('00');
                          } else {
                            const num = Math.min(23, parseInt(formHours) || 0);
                            setFormHours(String(num).padStart(2, '0'));
                          }
                        }}
                        placeholder="00"
                        className={`w-6 text-center text-xs font-bold bg-transparent outline-hidden ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      />
                      <span className="text-[10px] font-bold text-slate-400 select-none pl-0.5">h</span>
                    </div>

                    <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>:</span>

                    {/* Bloco de Minutos */}
                    <div className={`flex items-center px-2 py-1.5 rounded border transition ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 focus-within:border-emerald-500' 
                        : 'bg-slate-50 border-slate-200 focus-within:border-emerald-500'
                    }`}>
                      <input
                        ref={minutesInputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={formMinutes}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                          setFormMinutes(digits);
                        }}
                        onBlur={() => {
                          if (!formMinutes) {
                            setFormMinutes('00');
                          } else {
                            const num = Math.min(59, parseInt(formMinutes) || 0);
                            setFormMinutes(String(num).padStart(2, '0'));
                          }
                        }}
                        placeholder="30"
                        className={`w-6 text-center text-xs font-bold bg-transparent outline-hidden ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      />
                      <span className="text-[10px] font-bold text-slate-400 select-none pl-0.5">min</span>
                    </div>

                    {/* Badge de Resumo Formatado */}
                    <span className={`text-[10.5px] font-bold shrink-0 ml-2 px-1.5 py-0.5 rounded border whitespace-nowrap ${
                      isDark ? 'bg-slate-900/60 border-slate-800 text-emerald-400' : 'bg-slate-100 border-slate-200 text-emerald-600'
                    }`}>
                      {formatHoursMinutesToDuration(formHours, formMinutes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. DESCRIÇÃO */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  5. Descrição do Serviço
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva a técnica, acabamento, produtos ou benefícios..."
                  className={`w-full px-3 py-2 rounded text-xs border resize-none ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } outline-hidden`}
                />
              </div>

              {/* 6. MÍDIA DO SERVIÇO & GALERIA PRONTA */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>6. Mídia / Galeria do Serviço</span>
                  </label>
                  <span className="text-[9.5px] font-bold text-emerald-400">
                    {formPhotoCover ? 'Foto Selecionada' : 'Escolha Rápida'}
                  </span>
                </div>

                {/* Galeria de Fotos Prontas para a Categoria (1 Toque) */}
                <div className={`p-2.5 rounded border space-y-2 ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Fotos Prontas: {formCategory}</span>
                    </span>
                    <span className="text-[9px] text-slate-400">1 toque para definir</span>
                  </div>

                  {/* Carrossel horizontal de presets */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {getGalleryPresetsForCategory(formCategory).map((preset) => {
                      const isSelected = formPhotoCover === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setFormPhotoCover(isSelected ? '' : preset.url);
                          }}
                          className={`relative w-16 h-16 rounded overflow-hidden shrink-0 border-2 transition active:scale-95 cursor-pointer group ${
                            isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-700/60 hover:border-slate-500'
                          }`}
                          title={preset.title}
                        >
                          <img
                            src={preset.url}
                            alt={preset.title}
                            className="w-full h-full object-cover transition group-hover:scale-105"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white stroke-[3] drop-shadow" />
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/75 px-1 py-0.5 text-[7.5px] text-white truncate text-center font-medium">
                            {preset.title.split(' ')[0]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bloco 2: Mídia Personalizada / Gerenciador Completo */}
                {editingServiceId ? (
                  (() => {
                    const currentService = services.find((s) => s.id === editingServiceId);
                    const srvMode = currentService?.displayMode || (currentService?.mediaType === 'video' ? 'video' : 'static');
                    const photoCount = currentService?.photos?.length || (currentService?.image || formPhotoCover ? 1 : 0);
                    const isVideoMode = srvMode === 'video' && !!currentService?.videoUrl;
                    const activeThumb = formPhotoCover || currentService?.image || currentService?.photos?.[0];

                    return (
                      <div className={`p-2.5 rounded border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="w-10 h-10 rounded overflow-hidden relative shrink-0 bg-slate-950 border border-slate-800 flex items-center justify-center">
                          {isVideoMode ? (
                            <video
                              src={currentService?.videoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : activeThumb ? (
                            <img
                              src={activeThumb}
                              alt={currentService?.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {activeThumb ? 'Capa definida' : 'Sem foto definida'}
                          </p>
                          <p className={`text-[9.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formPhotoCover ? 'Foto selecionada da galeria' : 'Adicione foto, slide ou vídeo'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (currentService) {
                              handleOpenMediaManager(currentService);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] cursor-pointer shrink-0 flex items-center gap-1 shadow-sm active:scale-98"
                        >
                          <Camera className="w-3.5 h-3.5 text-white" />
                          <span>Mídia Pro</span>
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className={`p-2 rounded border text-[9.5px] flex items-center justify-between gap-2 ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <span className="flex items-center gap-1.5 truncate">
                      <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{formPhotoCover ? 'Capa selecionada com sucesso!' : 'Toque em uma foto pronta acima para ilustrar o serviço.'}</span>
                    </span>
                    {formPhotoCover && (
                      <button
                        type="button"
                        onClick={() => setFormPhotoCover('')}
                        className="text-rose-400 hover:underline shrink-0 text-[9px] font-bold cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Botões de Ação Fixos no Rodapé */}
              <div className={`pt-2 sticky bottom-0 z-20 flex items-center gap-2 ${
                isDark ? 'bg-slate-950/95' : 'bg-white/95'
              } backdrop-blur-xs`}>
                {editingServiceId && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentSrv = services.find((s) => s.id === editingServiceId);
                      if (currentSrv) {
                        setIsModalOpen(false);
                        setDeleteConfirmService(currentSrv);
                      }
                    }}
                    className={`px-3 py-2.5 rounded border transition cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 ${
                      isDark 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                        : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                    }`}
                    title="Excluir este serviço"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded bg-[#20C933] hover:bg-[#1bb32d] active:scale-98 text-white font-bold text-xs uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>{editingServiceId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR SERVIÇO'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: GERENCIADOR DE MÍDIA SOB DEMANDA (FOTO / SLIDE / VÍDEO) */}
      {/* ============================================================ */}
      {mediaModalService && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setMediaModalService(null)}
        >
          <div 
            className={`w-full max-w-md max-h-[92vh] rounded-lg flex flex-col overflow-hidden shadow-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Gerenciador de Mídia */}
            <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins'] truncate">
                    Mídia: {mediaModalService.title}
                  </h3>
                  <p className="text-[9px] text-slate-400 truncate">
                    Categoria: {mediaModalService.category}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMediaModalService(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Gerenciador de Mídia */}
            <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1">
              {/* 1. SELEÇÃO DO FORMATO DE EXIBIÇÃO */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  1. Formato de Exibição
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Opção 1: Foto Única */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMediaDisplayMode('static');
                    }}
                    className={`p-2 rounded text-left transition cursor-pointer border flex flex-col justify-between ${
                      mediaDisplayMode === 'static'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <ImageIcon className={`w-3.5 h-3.5 ${mediaDisplayMode === 'static' ? 'text-white' : 'text-emerald-400'}`} />
                      {mediaDisplayMode === 'static' && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide">Foto Única</p>
                      <p className={`text-[9px] ${mediaDisplayMode === 'static' ? 'text-white' : 'text-slate-400'} line-clamp-1`}>
                        1 foto fixa
                      </p>
                    </div>
                  </button>

                  {/* Opção 2: Slide de Fotos */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMediaDisplayMode('slideshow');
                    }}
                    className={`p-2 rounded text-left transition cursor-pointer border flex flex-col justify-between ${
                      mediaDisplayMode === 'slideshow'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Images className={`w-3.5 h-3.5 ${mediaDisplayMode === 'slideshow' ? 'text-white' : 'text-emerald-400'}`} />
                      {mediaDisplayMode === 'slideshow' && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide">Slide de Fotos</p>
                      <p className={`text-[9px] ${mediaDisplayMode === 'slideshow' ? 'text-white' : 'text-slate-400'} line-clamp-1`}>
                        Até 5 fotos
                      </p>
                    </div>
                  </button>

                  {/* Opção 3: Vídeo 5s */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMediaDisplayMode('video');
                    }}
                    className={`p-2 rounded text-left transition cursor-pointer border flex flex-col justify-between ${
                      mediaDisplayMode === 'video'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Video className={`w-3.5 h-3.5 ${mediaDisplayMode === 'video' ? 'text-white' : 'text-emerald-400'}`} />
                      {mediaDisplayMode === 'video' && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide">Vídeo 5s</p>
                      <p className={`text-[9px] ${mediaDisplayMode === 'video' ? 'text-white' : 'text-slate-400'} line-clamp-1`}>
                        Loop 5 seg
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. ORIGEM DA MÍDIA: BIBLIOTECA, DO DISPOSITIVO OU CAPTURAR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    2. Origem da Mídia
                  </label>
                  <span className="text-[9px] text-emerald-400 font-semibold">
                    {mediaDisplayMode === 'video' ? 'Vídeo vertical' : mediaDisplayMode === 'slideshow' ? 'Slide (até 5 fotos)' : 'Foto única'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {/* Opção 1: Biblioteca */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMediaLibraryCategory(mediaModalService.category || 'Todas');
                      setIsMediaLibraryModalOpen(true);
                    }}
                    className={`py-2 px-1 rounded border font-bold text-xs transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer active:scale-98 ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500 hover:text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] whitespace-nowrap">Biblioteca</span>
                  </button>

                  {/* Opção 2: Do Dispositivo */}
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaDisplayMode === 'video') {
                        deviceVideoInputRef.current?.click();
                      } else {
                        devicePhotoInputRef.current?.click();
                      }
                    }}
                    className={`py-2 px-1 rounded border font-bold text-xs transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer active:scale-98 ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500 hover:text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] whitespace-nowrap">Dispositivo</span>
                  </button>

                  {/* Opção 3: Capturar (Câmera) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaDisplayMode === 'video') {
                        cameraVideoInputRef.current?.click();
                      } else {
                        cameraPhotoInputRef.current?.click();
                      }
                    }}
                    className="py-2 px-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer shadow-sm active:scale-98"
                  >
                    <Camera className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />
                    <span className="text-[10px] text-white whitespace-nowrap">Capturar</span>
                  </button>
                </div>

                {/* 2.5. Sugestões de Fotos Prontas para a Categoria */}
                {mediaDisplayMode !== 'video' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Fotos Prontas ({mediaModalService.category})</span>
                      </span>
                      <span className="text-[9px] text-slate-500">1 toque para selecionar</span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {getGalleryPresetsForCategory(mediaModalService.category).map((preset) => {
                        const isSelected = mediaPhotos.includes(preset.url);
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              hapticLight();
                              if (mediaDisplayMode === 'static') {
                                setMediaPhotos([preset.url]);
                              } else {
                                if (isSelected) {
                                  setMediaPhotos((prev) => prev.filter((p) => p !== preset.url));
                                } else {
                                  if (mediaPhotos.length >= 5) {
                                    showToast('Limite de 5 fotos atingido.');
                                  } else {
                                    setMediaPhotos((prev) => [...prev, preset.url]);
                                  }
                                }
                              }
                            }}
                            className={`relative w-14 h-14 rounded overflow-hidden shrink-0 border-2 transition active:scale-95 cursor-pointer group ${
                              isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-800 hover:border-slate-600'
                            }`}
                            title={preset.title}
                          >
                            <img src={preset.url} alt={preset.title} className="w-full h-full object-cover transition group-hover:scale-105" loading="lazy" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. VISUALIZAÇÃO E GESTÃO DAS MÍDIAS ATIVAS */}
              {mediaDisplayMode === 'video' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vídeo Selecionado
                  </label>
                  {mediaVideoUrl ? (
                    <div className="w-full h-32 rounded overflow-hidden relative bg-slate-950 border border-slate-800">
                      <video
                        src={mediaVideoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-slate-950/90 border border-emerald-500/40 text-emerald-400 text-[8px] font-black flex items-center gap-1 shadow-sm">
                        <Video className="w-2.5 h-2.5 text-emerald-400" />
                        <span>VÍDEO ATIVO ({mediaVideoDuration}s)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 p-3 text-center">
                      <Video className="w-5 h-5 text-slate-500 mb-1" />
                      <span className="text-[10px]">Nenhum vídeo selecionado</span>
                    </div>
                  )}

                  {videoDurationWarning && (
                    <div className="flex items-center gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>{videoDurationWarning}</span>
                    </div>
                  )}
                </div>
              ) : mediaDisplayMode === 'slideshow' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Fotos do Slide ({mediaPhotos.length}/5)
                    </label>
                    <span className="text-[9px] text-slate-400">Toque no X para remover</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {mediaPhotos.map((photoUrl, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded overflow-hidden relative border border-emerald-500/60 bg-slate-950 group"
                      >
                        <img src={photoUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-slate-950/90 text-emerald-400 text-[8px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoFromSlide(idx)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {mediaPhotos.length < 5 && (
                      <div
                        onClick={() => devicePhotoInputRef.current?.click()}
                        className="aspect-square rounded border border-dashed border-slate-700 hover:border-emerald-500/80 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer text-slate-500 hover:text-emerald-400 bg-slate-950/40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-bold">+ Foto</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Foto Ativa
                  </label>
                  {mediaPhotos[0] ? (
                    <div className="flex items-center gap-2.5 p-2 rounded bg-slate-900/80 border border-emerald-500/40">
                      <div className="w-12 h-12 rounded overflow-hidden bg-slate-950 shrink-0 relative">
                        <img 
                          src={mediaPhotos[0]} 
                          alt="Foto selecionada" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-black uppercase">
                          Foto de Capa
                        </span>
                        <p className="text-[11px] font-bold text-white truncate mt-1">
                          {mediaModalService.title}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-16 rounded border border-dashed border-slate-700 flex items-center justify-center text-slate-500 p-2 text-center text-[10px]">
                      Nenhuma foto selecionada. Escolha pela biblioteca ou câmera acima.
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Salvar Mídia no Serviço */}
              <div className="pt-2 sticky bottom-0 z-20">
                <button
                  type="button"
                  onClick={handleSaveMediaToService}
                  className="w-full py-2.5 rounded bg-[#20C933] hover:bg-[#1bb32d] active:scale-98 text-white font-bold text-xs uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>SALVAR MÍDIA DO SERVIÇO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: BIBLIOTECA DE MÍDIAS SALVAS (SELEÇÃO DEDICADA) */}
      {/* ============================================================ */}
      {isMediaLibraryModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsMediaLibraryModalOpen(false)}
        >
          <div 
            className={`w-full max-w-md max-h-[88vh] rounded-lg flex flex-col overflow-hidden shadow-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal da Biblioteca */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  {mediaDisplayMode === 'video' ? (
                    <Film className="w-4 h-4 text-emerald-400" />
                  ) : mediaDisplayMode === 'slideshow' ? (
                    <Images className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">
                    {mediaDisplayMode === 'video' 
                      ? 'Biblioteca de Vídeos' 
                      : mediaDisplayMode === 'slideshow' 
                      ? `Fotos para o Slide (${mediaPhotos.length}/5)`
                      : 'Biblioteca de Fotos'}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    {mediaDisplayMode === 'video'
                      ? 'Toque para selecionar o vídeo'
                      : mediaDisplayMode === 'slideshow'
                      ? 'Selecione até 5 fotos'
                      : 'Toque para definir a foto'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaLibraryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barra de Filtros de Categoria da Biblioteca */}
            <div className={`px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 ${
              isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-white'
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1">
                Filtro:
              </span>
              {availableLibraryCategories.map((cat) => {
                const isActive = mediaLibraryCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMediaLibraryCategory(cat);
                    }}
                    className={`py-1 px-2.5 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Conteúdo com Scroll da Biblioteca */}
            <div className="p-4 overflow-y-auto no-scrollbar flex-1">
              {mediaDisplayMode === 'video' ? (
                filteredSavedVideos.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Film className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-bold">Nenhum vídeo nesta categoria</p>
                    <p className="text-[10px] text-slate-500 mt-1">Grave ou envie um vídeo pelo botão no gerenciador</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredSavedVideos.map((vid) => {
                      const isSelected = mediaVideoUrl === vid.url;
                      return (
                        <button
                          key={vid.id}
                          type="button"
                          onClick={() => {
                            hapticSuccess();
                            setMediaVideoUrl(vid.url);
                            setMediaVideoDuration(vid.duration || 5);
                            setVideoDurationWarning(null);
                            setIsMediaLibraryModalOpen(false);
                            showToast(`Vídeo selecionado para o serviço!`);
                          }}
                          className={`p-2 rounded flex flex-col gap-1.5 border transition cursor-pointer text-left relative ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40'
                              : isDark
                              ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                              : 'border-slate-200 bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-full aspect-video rounded overflow-hidden bg-slate-950 relative">
                            <video src={vid.url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[8px] font-black">
                              {vid.duration || 5}s
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate text-white">
                              {vid.title}
                            </p>
                            <span className="text-[9px] text-emerald-400 font-semibold block">
                              {vid.category}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                filteredSavedImages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-bold">Nenhuma imagem nesta categoria</p>
                    <p className="text-[10px] text-slate-500 mt-1">Tire uma foto ou faça upload pelo gerenciador</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredSavedImages.map((item) => {
                      if (mediaDisplayMode === 'static') {
                        const isSelected = mediaPhotos[0] === item.url;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              hapticSuccess();
                              setMediaPhotos([item.url]);
                              setIsMediaLibraryModalOpen(false);
                              showToast(`Foto selecionada!`);
                            }}
                            className={`aspect-square rounded overflow-hidden relative border transition cursor-pointer text-left ${
                              isSelected
                                ? 'ring-2 ring-emerald-500 border-transparent shadow-md'
                                : isDark
                                ? 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
                                : 'border-slate-200 hover:border-slate-400 opacity-85 hover:opacity-100'
                            }`}
                          >
                            <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 px-1 py-0.5 text-[8px] text-slate-300 font-semibold truncate">
                              {item.category}
                            </div>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                                <Check className="w-3 h-3 text-white stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      } else {
                        // Modo Slideshow (Até 5 fotos)
                        const slideIndex = mediaPhotos.indexOf(item.url);
                        const isInSlide = slideIndex !== -1;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (isInSlide) {
                                handleRemovePhotoFromSlide(slideIndex);
                              } else {
                                if (mediaPhotos.length >= 5) {
                                  showToast('Máximo de 5 fotos no slide atingido!');
                                  return;
                                }
                                setMediaPhotos((prev) => [...prev, item.url]);
                                hapticSuccess();
                                showToast(`Foto adicionada ao slide (${mediaPhotos.length + 1}/5)!`);
                              }
                            }}
                            className={`aspect-square rounded overflow-hidden relative border transition cursor-pointer text-left ${
                              isInSlide
                                ? 'ring-2 ring-emerald-500 border-transparent shadow-md'
                                : isDark
                                ? 'border-slate-800 hover:border-slate-600 opacity-75 hover:opacity-100'
                                : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 px-1 py-0.5 text-[8px] text-slate-300 font-semibold truncate">
                              {item.category}
                            </div>
                            {isInSlide && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shadow-md">
                                {slideIndex === 0 ? '1' : slideIndex + 1}
                              </div>
                            )}
                          </button>
                        );
                      }
                    })}
                  </div>
                )
              )}
            </div>

            {/* Rodapé Fixo da Biblioteca */}
            <div className={`p-3 border-t flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
            }`}>
              {mediaDisplayMode === 'slideshow' ? (
                <>
                  <span className="text-[11px] font-bold text-slate-300">
                    {mediaPhotos.length}/5 fotos no slide
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      hapticSuccess();
                      setIsMediaLibraryModalOpen(false);
                    }}
                    className="py-2 px-4 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-98"
                  >
                    <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    <span>Concluir Seleção</span>
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-slate-400">
                    {mediaDisplayMode === 'video' ? 'Selecione um vídeo' : 'Selecione uma foto'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMediaLibraryModalOpen(false)}
                    className={`py-1.5 px-3 rounded text-xs font-bold transition cursor-pointer border ${
                      isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: PRÉVIA DEDICADA DO ANÚNCIO (PORTAL & MODO PÚBLICO) */}
      {/* ============================================================ */}
      {previewService && (
        <div 
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewService(null)}
        >
          <div 
            className={`w-full max-w-xs rounded-xl overflow-hidden shadow-2xl border flex flex-col ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className={`p-3 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold truncate font-['Poppins']">
                    Prévia do Anúncio
                  </h3>
                  <p className="text-[9px] text-slate-400 truncate">
                    Portal VagouApp • Modo Público
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewService(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo: Card com Proporção Idêntica à Vitrine */}
            <div className="p-4 flex flex-col items-center justify-center">
              <div className="w-full max-w-[250px]">
                <ServicePublicAdPreview
                  title={previewService.title}
                  category={previewService.category}
                  price={previewService.price}
                  duration={previewService.duration}
                  displayMode={previewService.displayMode || (previewService.mediaType === 'video' || previewService.videoUrl ? 'video' : 'static')}
                  image={previewService.image}
                  photos={previewService.photos}
                  videoUrl={previewService.videoUrl}
                  className="aspect-square w-full"
                />
              </div>

              {/* Informações Complementares */}
              {previewService.description && (
                <div className={`mt-3 w-full p-2.5 rounded border text-[11px] ${
                  isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <span className="font-bold text-[10px] text-emerald-400 uppercase tracking-wider block mb-0.5">
                    Descrição do Procedimento
                  </span>
                  <p className="line-clamp-3 leading-relaxed">{previewService.description}</p>
                </div>
              )}
            </div>

            {/* Rodapé com Ações */}
            <div className={`p-3 border-t flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setPreviewService(null)}
                className={`flex-1 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                  isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const srv = previewService;
                  setPreviewService(null);
                  handleOpenMediaManager(srv);
                }}
                className="flex-1 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
                <span>Mídia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: CONFIRMAÇÃO DE EXCLUSÃO DE SERVIÇO */}
      {/* ============================================================ */}
      {deleteConfirmService && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeleteConfirmService(null)}
        >
          <div 
            className={`w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border p-4.5 space-y-4 ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold font-['Poppins']">
                  Excluir Serviço?
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                  Tem certeza que deseja excluir <strong className={isDark ? 'text-white' : 'text-slate-900'}>"{deleteConfirmService.title}"</strong>? Esta ação removerá o serviço do catálogo e do banco de dados.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setDeleteConfirmService(null)}
                className={`px-3.5 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                  isDark 
                    ? 'border-slate-800 text-slate-300 hover:bg-slate-900' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteService(deleteConfirmService.id)}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-98"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Excluir Serviço</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ESCOLHA DE CRIAÇÃO ("+ Novo") */}
      {/* ============================================================ */}
      {isChooseCreateModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsChooseCreateModalOpen(false)}
        >
          <div 
            className={`w-full max-w-xs rounded-xl overflow-hidden shadow-2xl border p-4.5 space-y-4 ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
              <h3 className="text-xs font-black uppercase tracking-wider font-['Poppins'] text-emerald-400">
                O que deseja criar?
              </h3>
              <button 
                type="button" 
                onClick={() => setIsChooseCreateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsChooseCreateModalOpen(false);
                  handleOpenNew(selectedCategory);
                }}
                className={`p-3 rounded-lg border text-left flex items-center gap-3 transition cursor-pointer active:scale-[0.98] ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 text-white' 
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-500 text-slate-900'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide">Novo Serviço</p>
                  <p className="text-[10px] text-slate-400">Para a vitrine do seu salão</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsChooseCreateModalOpen(false);
                  setIsNewCategoryModalOpen(true);
                }}
                className={`p-3 rounded-lg border text-left flex items-center gap-3 transition cursor-pointer active:scale-[0.98] ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 text-white' 
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-500 text-slate-900'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide">Nova Categoria</p>
                  <p className="text-[10px] text-slate-400">Para organizar seus serviços</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CRIAR CATEGORIA */}
      {/* ============================================================ */}
      {isNewCategoryModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setIsNewCategoryModalOpen(false);
            setNewCategoryModalName('');
          }}
        >
          <div 
            className={`w-full max-w-xs rounded-xl overflow-hidden shadow-2xl border p-4.5 space-y-4 ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
              <h3 className="text-xs font-black uppercase tracking-wider font-['Poppins'] text-emerald-400">
                Nova Categoria
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsNewCategoryModalOpen(false);
                  setNewCategoryModalName('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Nome da Categoria
              </label>
              <input
                type="text"
                value={newCategoryModalName}
                onChange={(e) => setNewCategoryModalName(e.target.value)}
                placeholder="Ex: Barba, Depilação, Unhas..."
                autoFocus
                className={`w-full px-3 py-2 rounded text-xs border ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                } outline-hidden`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategoryFromModal();
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => {
                  setIsNewCategoryModalOpen(false);
                  setNewCategoryModalName('');
                }}
                className={`px-3.5 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                  isDark 
                    ? 'border-slate-800 text-slate-300 hover:bg-slate-900' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateCategoryFromModal}
                disabled={!newCategoryModalName.trim()}
                className="px-4 py-2 rounded bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1 active:scale-98"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE CATEGORIA */}
      {/* ============================================================ */}
      {deleteConfirmCategory && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeleteConfirmCategory(null)}
        >
          <div 
            className={`w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border p-4.5 space-y-4 ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold font-['Poppins']">
                  Excluir Categoria?
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                  Tem certeza que deseja excluir a categoria <strong className={isDark ? 'text-white' : 'text-slate-900'}>"{deleteConfirmCategory}"</strong>? 
                  <br />
                  <span className="text-emerald-400 font-semibold">Nota:</span> Seus serviços associados não serão excluídos, eles serão movidos de forma segura para a categoria <strong className={isDark ? 'text-white' : 'text-slate-900'}>"Outros"</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setDeleteConfirmCategory(null)}
                className={`px-3.5 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                  isDark 
                    ? 'border-slate-800 text-slate-300 hover:bg-slate-900' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(deleteConfirmCategory)}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-98"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Excluir Categoria</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
