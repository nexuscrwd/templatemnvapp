import { supabase, getDbClient } from '../lib/supabase';

function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim());
}

// ============================================================================
// 1. SERVIÇOS (salon_services + services + salons.branding.catalogServices)
// ============================================================================
export async function syncSalonServiceToDatabase(
  salonId: string,
  service: {
    id?: string;
    name: string;
    category: string;
    price: number;
    durationMinutes: number;
    commissionRate?: number;
    description?: string;
    photos?: string[];
    videos?: { id: string; url: string; title?: string; duration_seconds: number }[];
    slides?: string[];
    isActive?: boolean;
  }
) {
  const client = getDbClient();
  if (!client || !salonId) return null;

  let resolvedSalonUuid = salonId;
  if (!isValidUuid(salonId)) {
    try {
      const { data: sRow } = await (client.from('salons') as any).select('id').eq('slug', salonId).maybeSingle();
      if (sRow?.id) {
        resolvedSalonUuid = sRow.id;
      } else {
        const activeDbId = typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_db_id') : null;
        if (isValidUuid(activeDbId)) resolvedSalonUuid = activeDbId!;
      }
    } catch {}
  }

  const serviceId = isValidUuid(service.id) ? String(service.id) : generateUuidV4();
  const firstPhoto =
    (service.photos && service.photos.length > 0 ? service.photos[0] : null) ||
    (service.slides && service.slides.length > 0 ? service.slides[0] : null);

  const basePayload: Record<string, any> = {
    id: serviceId,
    salon_id: resolvedSalonUuid,
    name: service.name,
    title: service.name,
    category: service.category || 'Geral',
    price: Number(service.price) || 0,
    duration_minutes: Number(service.durationMinutes) || 30,
    commission_rate: Number(service.commissionRate ?? 50),
    description: service.description || '',
    image_url: firstPhoto,
    photos: service.photos || [],
    videos: service.videos || [],
    slides: service.slides || [],
    is_active: service.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  // 1A. Upsert em public.salon_services (ignora silenciosamente caso a tabela ainda não exista)
  const salonServicesPromise = (async () => {
    try {
      return await (client.from('salon_services' as any) as any).upsert(basePayload, { onConflict: 'id' });
    } catch {
      return null;
    }
  })();

  // 1B. Upsert em public.services (com fallback automático caso commission_rate não exista na tabela)
  const servicesPromise = (async () => {
    try {
      const res = await (client.from('services') as any).upsert(basePayload, { onConflict: 'id' });
      if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703' || res.error.message?.includes('column'))) {
        const fallbackPayload = { ...basePayload };
        delete fallbackPayload.commission_rate;
        return await (client.from('services') as any).upsert(fallbackPayload, { onConflict: 'id' });
      }
      return res;
    } catch {
      return null;
    }
  })();

  return await Promise.all([salonServicesPromise, servicesPromise]);
}

// ============================================================================
// 2. GALERIA DE MÍDIAS (salon_media_items + salons cover/logo)
// ============================================================================
export async function syncSalonMediaToDatabase(
  salonId: string,
  mediaItem: {
    id?: string;
    title: string;
    url: string;
    type: 'image' | 'video';
    media_group: 'fotos' | 'videos' | 'imagens';
    category: 'servicos' | 'profissionais' | 'espaco' | 'banner' | 'logotipo';
    duration_seconds?: number;
    is_cover?: boolean;
  }
) {
  const client = getDbClient();
  if (!client || !salonId) return { data: null, error: new Error('Cliente Supabase indisponível') };

  try {
    const mediaId = isValidUuid(mediaItem.id) ? String(mediaItem.id) : generateUuidV4();
    const { data, error } = await (client.from('salon_media_items' as any) as any)
      .upsert(
        {
          id: mediaId,
          salon_id: salonId,
          title: mediaItem.title || 'Mídia do Salão',
          url: mediaItem.url,
          type: mediaItem.type,
          media_group: mediaItem.media_group,
          category: mediaItem.category,
          duration_seconds: mediaItem.duration_seconds || 5,
          is_cover: mediaItem.is_cover || false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle();

    if (mediaItem.is_cover || mediaItem.category === 'banner') {
      await (client.from('salons') as any).update({ cover_image_url: mediaItem.url, cover_url: mediaItem.url }).eq('id', salonId);
    }
    if (mediaItem.category === 'logotipo') {
      await (client.from('salons') as any).update({ logo_url: mediaItem.url }).eq('id', salonId);
    }
    return { data, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function deleteSalonMediaFromDatabase(salonId: string, mediaIdOrUrl: string) {
  const client = getDbClient();
  if (!client || !salonId || !mediaIdOrUrl) return { success: false };
  try {
    if (isValidUuid(mediaIdOrUrl)) {
      await (client.from('salon_media_items' as any) as any).delete().eq('salon_id', salonId).eq('id', mediaIdOrUrl);
    } else {
      await (client.from('salon_media_items' as any) as any).delete().eq('salon_id', salonId).eq('url', mediaIdOrUrl);
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function fetchSalonMediaFromDatabase(salonId: string) {
  const client = getDbClient() || supabase;
  if (!client || !salonId) return [];
  try {
    const { data, error } = await (client.from('salon_media_items' as any) as any)
      .select('*')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

// ============================================================================
// 3. TEMA CAMALEÃO & FOTOS DO ESPAÇO (salons + salons.branding)
// ============================================================================
export type ChameleonPresetId = 'emerald-dark' | 'gold-luxury' | 'rose-glam' | 'purple-neon' | 'clean-light';

export function resolveThemePresetFromColor(hexColor?: string, isDarkTheme = true): ChameleonPresetId {
  const c = (hexColor || '').toLowerCase();
  if (c === '#f59e0b' || c === '#d97706') return 'gold-luxury';
  if (c === '#ef4444' || c === '#ec4899' || c === '#f43f5e') return 'rose-glam';
  if (c === '#8b5cf6' || c === '#a855f7') return 'purple-neon';
  if (!isDarkTheme && (c === '#3b82f6' || c === '#0ea5e9')) return 'clean-light';
  return 'emerald-dark';
}

export async function syncSalonThemeAndBranding(
  salonId: string,
  themeData: {
    themePresetId: ChameleonPresetId;
    primaryColor?: string;
    secondaryColor?: string;
    facadePhotoUrl?: string;
    interiorPhotoUrl?: string;
  }
) {
  const client = getDbClient();
  if (!client || !salonId) return null;

  const isUuid = isValidUuid(salonId);
  const matchFilter = isUuid ? { id: salonId } : { slug: salonId };

  const { data: currentSalon } = await (client.from('salons') as any)
    .select('id, branding, primary_color, secondary_color')
    .match(matchFilter)
    .maybeSingle();

  const existingBranding =
    currentSalon?.branding && typeof currentSalon.branding === 'object' ? currentSalon.branding : {};

  const updatedBranding = {
    ...existingBranding,
    themePresetId: themeData.themePresetId,
    ...(themeData.primaryColor ? { primaryColor: themeData.primaryColor } : {}),
    ...(themeData.secondaryColor ? { secondaryColor: themeData.secondaryColor } : {}),
    ...(themeData.facadePhotoUrl !== undefined ? { facadePhotoUrl: themeData.facadePhotoUrl } : {}),
    ...(themeData.interiorPhotoUrl !== undefined ? { interiorPhotoUrl: themeData.interiorPhotoUrl } : {}),
  };

  const fullPayload: Record<string, any> = {
    theme_preset_id: themeData.themePresetId,
    ...(themeData.primaryColor ? { primary_color: themeData.primaryColor } : {}),
    ...(themeData.secondaryColor ? { secondary_color: themeData.secondaryColor } : {}),
    ...(themeData.facadePhotoUrl !== undefined ? { facade_photo_url: themeData.facadePhotoUrl } : {}),
    ...(themeData.interiorPhotoUrl !== undefined ? { interior_photo_url: themeData.interiorPhotoUrl } : {}),
    branding: updatedBranding,
    updated_at: new Date().toISOString(),
  };

  let res = await (client.from('salons') as any).update(fullPayload).match(matchFilter);

  if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703' || res.error.message?.includes('column'))) {
    const safePayload: Record<string, any> = {
      ...(themeData.primaryColor ? { primary_color: themeData.primaryColor } : {}),
      ...(themeData.secondaryColor ? { secondary_color: themeData.secondaryColor } : {}),
      branding: updatedBranding,
      updated_at: new Date().toISOString(),
    };
    res = await (client.from('salons') as any).update(safePayload).match(matchFilter);
  }

  return res;
}

// ============================================================================
// 4. PROFISSIONAIS & COMISSÕES (professionals)
// ============================================================================
export async function syncSalonProfessionalToDatabase(
  salonId: string,
  pro: {
    id?: string;
    name: string;
    role: string;
    accessLevel?: 'admin' | 'professional' | 'receptionist';
    phone?: string;
    email?: string;
    avatarUrl?: string;
    commissionRate: number;
    productCommissionRate?: number;
    specialties?: string[];
    isActive?: boolean;
  }
) {
  const client = getDbClient();
  if (!client || !salonId) return null;

  const proId = isValidUuid(pro.id) ? String(pro.id) : generateUuidV4();
  const fullPayload: Record<string, any> = {
    id: proId,
    salon_id: salonId,
    name: pro.name,
    full_name: pro.name,
    role: pro.role || 'Profissional',
    access_level: pro.accessLevel || 'professional',
    phone: pro.phone || '',
    phone_whatsapp: pro.phone || '',
    email: pro.email || '',
    avatar_url: pro.avatarUrl || '',
    commission_rate: Number(pro.commissionRate) || 50,
    product_commission_rate: Number(pro.productCommissionRate ?? 10),
    specialties: pro.specialties || [],
    is_active: pro.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  let res = await (client.from('professionals') as any).upsert(fullPayload, { onConflict: 'id' });
  if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703' || res.error.message?.includes('column'))) {
    const safePayload = { ...fullPayload };
    delete safePayload.commission_rate;
    delete safePayload.product_commission_rate;
    res = await (client.from('professionals') as any).upsert(safePayload, { onConflict: 'id' });
  }
  return res;
}

// ============================================================================
// 5. CONTA FAMÍLIA & DEPENDENTES (public.dependents + public.client_family_members + clients.dependents_count)
// ============================================================================
export async function syncClientDependentToDatabase(
  parentClientId: string,
  dependent: {
    id?: string;
    fullName: string;
    relationship: string;
    birthDate?: string | null;
    notes?: string | null;
    isUnlinked?: boolean;
    avatarUrl?: string | null;
    avatarEmoji?: string | null;
    gender?: string | null;
    autonomyLevel?: string;
    phone?: string | null;
    email?: string | null;
  }
) {
  const client = getDbClient();
  if (!client || !parentClientId) return null;

  const depId = isValidUuid(dependent.id) ? String(dependent.id) : generateUuidV4();
  const nowIso = new Date().toISOString();
  const validRel = ['son', 'daughter', 'child', 'spouse', 'parent', 'sibling', 'other'].includes(dependent.relationship)
    ? dependent.relationship
    : 'other';
  const cleanBirthDate = dependent.birthDate && String(dependent.birthDate).trim() !== '' ? dependent.birthDate : null;

  // 5A. Gravar em public.dependents (tabela oficial especificada no Master Rebuild v3.0)
  let depRow: any = null;
  try {
    const { data } = await (client.from('dependents' as any) as any)
      .upsert(
        {
          id: depId,
          parent_client_id: parentClientId,
          full_name: dependent.fullName,
          name: dependent.fullName,
          relationship: validRel,
          birth_date: cleanBirthDate,
          gender: dependent.gender || null,
          phone: dependent.phone || null,
          notes: dependent.notes || null,
          is_unlinked: dependent.isUnlinked ?? false,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle();
    depRow = data;
  } catch {
    // Tabela dependents pode ainda não ter sido migrada no banco remoto
  }

  // 5B. Gravar em public.client_family_members (se a tabela legada existir)
  let familyRow: any = null;
  try {
    const { data } = await (client.from('client_family_members' as any) as any)
      .upsert(
        {
          id: depId,
          guardian_client_id: parentClientId,
          name: dependent.fullName,
          relationship: validRel,
          birth_date: cleanBirthDate,
          avatar_url: dependent.avatarUrl || null,
          avatar_emoji: dependent.avatarEmoji || null,
          gender: dependent.gender || null,
          notes: dependent.notes || null,
          autonomy_level: dependent.autonomyLevel || 'parent_controlled',
          phone: dependent.phone || null,
          email: dependent.email || null,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle();
    familyRow = data;
  } catch {}

  // 5C. Atualizar contador dependents_count em public.clients
  await refreshClientDependentsCount(parentClientId);

  return depRow || familyRow || { id: depId };
}

export async function refreshClientDependentsCount(parentClientId: string) {
  const client = getDbClient();
  if (!client || !parentClientId) return;
  try {
    let count = 0;
    try {
      const { data: deps } = await (client.from('dependents' as any) as any)
        .select('id')
        .eq('parent_client_id', parentClientId)
        .eq('is_unlinked', false);
      if (Array.isArray(deps)) count = deps.length;
    } catch {}

    if (count === 0) {
      try {
        const { data: members } = await (client.from('client_family_members' as any) as any)
          .select('id')
          .eq('guardian_client_id', parentClientId);
        if (Array.isArray(members)) count = members.length;
      } catch {}
    }

    await (client.from('clients') as any)
      .update({ dependents_count: count, updated_at: new Date().toISOString() })
      .eq('id', parentClientId);
  } catch {}
}

// ============================================================================
// 6. UTILIDADES: ENERGIA, ÁGUA, EQUIPAMENTOS, DRE & INSUMOS (salon_utilities_records + salons.branding.utilities)
// ============================================================================
export interface SalonUtilitiesPayload {
  energy_meters?: unknown[];
  energy_readings?: unknown[];
  water_meters?: unknown[];
  water_readings?: unknown[];
  appliances?: unknown[];
  dre_records?: unknown[];
  supply_items?: unknown[];
}

export async function syncSalonUtilitiesToDatabase(
  salonId: string,
  utilitiesPayload: SalonUtilitiesPayload
) {
  const client = getDbClient();
  if (!client || !salonId) return null;

  const isUuid = isValidUuid(salonId);
  const matchFilter = isUuid ? { id: salonId } : { slug: salonId };

  // Resolver UUID real do salão se foi passado slug
  let resolvedSalonUuid = isUuid ? salonId : '';
  let existingBranding: Record<string, any> = {};

  try {
    const { data: salonRow } = await (client.from('salons') as any)
      .select('id, branding')
      .match(matchFilter)
      .maybeSingle();
    if (salonRow?.id) resolvedSalonUuid = salonRow.id;
    if (salonRow?.branding && typeof salonRow.branding === 'object') {
      existingBranding = salonRow.branding;
    }
  } catch {}

  const nowIso = new Date().toISOString();

  // 6A. Persistir na tabela oficial public.salon_utilities_records (se existir)
  let tableRes: any = null;
  if (resolvedSalonUuid) {
    try {
      tableRes = await (client.from('salon_utilities_records' as any) as any).upsert(
        {
          salon_id: resolvedSalonUuid,
          ...utilitiesPayload,
          updated_at: nowIso,
        },
        { onConflict: 'salon_id' }
      );
    } catch {}
  }

  // 6B. Espelhar sempre em salons.branding.utilities para leitura imediata (Admin ⇄ Meu Negócio)
  try {
    const currentUtils =
      existingBranding.utilities && typeof existingBranding.utilities === 'object'
        ? existingBranding.utilities
        : {};

    const mergedUtilities = {
      ...currentUtils,
      ...utilitiesPayload,
      energyMeters: utilitiesPayload.energy_meters ?? currentUtils.energyMeters ?? [],
      energyReadings: utilitiesPayload.energy_readings ?? currentUtils.energyReadings ?? [],
      waterMeters: utilitiesPayload.water_meters ?? currentUtils.waterMeters ?? [],
      waterReadings: utilitiesPayload.water_readings ?? currentUtils.waterReadings ?? [],
      appliances: utilitiesPayload.appliances ?? currentUtils.appliances ?? [],
      financialTransactions: utilitiesPayload.dre_records ?? currentUtils.financialTransactions ?? [],
      inventoryItems: utilitiesPayload.supply_items ?? currentUtils.inventoryItems ?? [],
      updatedAt: nowIso,
    };

    await (client.from('salons') as any)
      .update({
        branding: {
          ...existingBranding,
          utilities: mergedUtilities,
        },
        updated_at: nowIso,
      })
      .match(matchFilter);
  } catch {}

  return tableRes;
}

/**
 * Coleta automaticamente os dados operacionais do localStorage do Meu Negócio e sincroniza no Supabase
 */
export async function syncAllLocalUtilitiesToDatabase(salonId?: string | null) {
  if (typeof window === 'undefined') return null;
  const targetSalonId =
    salonId ||
    localStorage.getItem('vagou_salon_db_id') ||
    localStorage.getItem('vagou_salon_slug') ||
    '';
  if (!targetSalonId) return null;

  const safeParse = (key: string, fallback: any = []) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const energyTariff = safeParse('vagou_energy_tariff_config', null);
  const energyMetersList = safeParse('vagou_energy_meters', []);
  const energyMeters =
    Array.isArray(energyMetersList) && energyMetersList.length > 0
      ? energyMetersList
      : energyTariff
      ? [energyTariff]
      : [];

  const energyReadings = safeParse(
    'vagou_energy_meter_readings',
    safeParse('vagou_energy_readings', [])
  );

  const waterTariff = safeParse('vagou_water_tariff_config', null);
  const waterMetersList = safeParse('vagou_water_meters', []);
  const waterMeters =
    Array.isArray(waterMetersList) && waterMetersList.length > 0
      ? waterMetersList
      : waterTariff
      ? [waterTariff]
      : [];

  const waterReadings = safeParse(
    'vagou_water_meter_readings',
    safeParse('vagou_water_readings', [])
  );

  const opEquipments = safeParse('vagou_operational_equipments', []);
  const infraEquipments = safeParse('vagou_infrastructure_equipments', []);
  const customAppliances = safeParse('vagou_appliances', []);
  const appliances =
    opEquipments.length > 0 || infraEquipments.length > 0
      ? [
          ...opEquipments.map((item: any) => ({ ...item, equipmentGroup: 'operational' })),
          ...infraEquipments.map((item: any) => ({ ...item, equipmentGroup: 'infrastructure' })),
        ]
      : customAppliances;

  const dreRecords = safeParse(
    'vagou_financial_expenses',
    safeParse('vagou_dre_records', [])
  );

  const supplyItems = safeParse(
    'vagou_salon_supplies',
    safeParse('vagou_supply_items', [])
  );

  // Espelhar nas chaves nominais do comunicado técnico para total paridade
  try {
    localStorage.setItem('vagou_energy_meters', JSON.stringify(energyMeters));
    localStorage.setItem('vagou_energy_readings', JSON.stringify(energyReadings));
    localStorage.setItem('vagou_water_meters', JSON.stringify(waterMeters));
    localStorage.setItem('vagou_water_readings', JSON.stringify(waterReadings));
    localStorage.setItem('vagou_appliances', JSON.stringify(appliances));
    localStorage.setItem('vagou_dre_records', JSON.stringify(dreRecords));
    localStorage.setItem('vagou_supply_items', JSON.stringify(supplyItems));
  } catch {}

  return await syncSalonUtilitiesToDatabase(targetSalonId, {
    energy_meters: Array.isArray(energyMeters) ? energyMeters : [energyMeters],
    energy_readings: Array.isArray(energyReadings) ? energyReadings : [],
    water_meters: Array.isArray(waterMeters) ? waterMeters : [waterMeters],
    water_readings: Array.isArray(waterReadings) ? waterReadings : [],
    appliances: Array.isArray(appliances) ? appliances : [],
    dre_records: Array.isArray(dreRecords) ? dreRecords : [],
    supply_items: Array.isArray(supplyItems) ? supplyItems : [],
  });
}

/**
 * Hidrata os registros de utilidades do Supabase (salon_utilities_records ou salons.branding.utilities)
 */
export async function fetchSalonUtilitiesFromDatabase(salonId: string): Promise<SalonUtilitiesPayload | null> {
  const client = getDbClient() || supabase;
  if (!client || !salonId) return null;

  const isUuid = isValidUuid(salonId);
  const matchFilter = isUuid ? { id: salonId } : { slug: salonId };

  try {
    let resolvedUuid = isUuid ? salonId : '';
    let brandingUtils: any = null;

    const { data: salonRow } = await (client.from('salons') as any)
      .select('id, branding')
      .match(matchFilter)
      .maybeSingle();

    if (salonRow?.id) resolvedUuid = salonRow.id;
    if (salonRow?.branding && typeof salonRow.branding === 'object' && salonRow.branding.utilities) {
      brandingUtils = salonRow.branding.utilities;
    }

    if (resolvedUuid) {
      try {
        const { data: record } = await (client.from('salon_utilities_records' as any) as any)
          .select('*')
          .eq('salon_id', resolvedUuid)
          .maybeSingle();
        if (record) {
          return {
            energy_meters: record.energy_meters || brandingUtils?.energy_meters || brandingUtils?.energyMeters,
            energy_readings: record.energy_readings || brandingUtils?.energy_readings || brandingUtils?.energyReadings,
            water_meters: record.water_meters || brandingUtils?.water_meters || brandingUtils?.waterMeters,
            water_readings: record.water_readings || brandingUtils?.water_readings || brandingUtils?.waterReadings,
            appliances: record.appliances || brandingUtils?.appliances,
            dre_records: record.dre_records || brandingUtils?.dre_records || brandingUtils?.financialTransactions,
            supply_items: record.supply_items || brandingUtils?.supply_items || brandingUtils?.inventoryItems,
          };
        }
      } catch {}
    }

    if (brandingUtils) {
      return {
        energy_meters: brandingUtils.energy_meters || brandingUtils.energyMeters,
        energy_readings: brandingUtils.energy_readings || brandingUtils.energyReadings,
        water_meters: brandingUtils.water_meters || brandingUtils.waterMeters,
        water_readings: brandingUtils.water_readings || brandingUtils.waterReadings,
        appliances: brandingUtils.appliances,
        dre_records: brandingUtils.dre_records || brandingUtils.financialTransactions,
        supply_items: brandingUtils.supply_items || brandingUtils.inventoryItems,
      };
    }
  } catch {}

  return null;
}

// ============================================================================
// 5. BLINDAGEM PGRST204 (safeSupabaseWrite) & PROPAGAÇÃO CRUZADA POR CPF (BOL-024)
// ============================================================================

/**
 * Intercepta automaticamente falhas PGRST204 / 42703 do PostgREST (caso alguma coluna
 * ainda não exista no cache de schema), remove apenas a coluna ausente e reexecuta a gravação.
 */
export async function safeSupabaseWrite(
  tableName: string,
  operation: 'insert' | 'update' | 'upsert',
  payload: Record<string, any>,
  options?: {
    matchFilter?: Record<string, any>;
    onConflict?: string;
    selectSingle?: boolean;
  }
): Promise<{ data: any; error: any; strippedColumns: string[] }> {
  const client = getDbClient() || supabase;
  if (!client) {
    return {
      data: null,
      error: new Error('Cliente Supabase indisponível'),
      strippedColumns: [],
    };
  }

  const workingPayload: Record<string, any> = { ...payload };
  const strippedColumns: string[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      let query: any = (client.from(tableName as any) as any);
      if (operation === 'insert') {
        query = query.insert(workingPayload);
      } else if (operation === 'upsert') {
        query = query.upsert(
          workingPayload,
          options?.onConflict ? { onConflict: options.onConflict } : undefined
        );
      } else {
        query = query.update(workingPayload);
        if (options?.matchFilter) {
          query = query.match(options.matchFilter);
        }
      }

      if (options?.selectSingle) {
        query = query.select().maybeSingle();
      }

      const { data, error } = await query;
      if (!error) {
        return { data, error: null, strippedColumns };
      }

      const errMsg = String(error.message || error.details || '');
      const isMissingCol =
        error.code === 'PGRST204' ||
        error.code === '42703' ||
        errMsg.includes('Could not find the') ||
        errMsg.includes('does not exist');

      if (!isMissingCol) {
        return { data, error, strippedColumns };
      }

      const matchCol =
        errMsg.match(/Could not find the '([^']+)' column/i) ||
        errMsg.match(/column "([^"]+)" of relation/i) ||
        errMsg.match(/column ([a-zA-Z0-9_]+) does not exist/i);

      const offendingCol = matchCol?.[1];
      if (offendingCol && offendingCol in workingPayload) {
        delete workingPayload[offendingCol];
        strippedColumns.push(offendingCol);
        continue;
      }

      return { data, error, strippedColumns };
    } catch (err: any) {
      return { data: null, error: err, strippedColumns };
    }
  }

  return {
    data: null,
    error: new Error('Limite de tentativas excedido em safeSupabaseWrite'),
    strippedColumns,
  };
}

/**
 * Propagação Cruzada de Endereço e Coordenadas GPS por CPF/E-mail (syncAddressAndCoordsAcrossCpfTables)
 * Propaga address, street_number, complement, neighborhood, city, state, cep,
 * latitude, longitude, formatted_address e google_place_id entre salons, clients,
 * professionals, profiles e salon_users vinculados ao mesmo CPF.
 */
export async function syncAddressAndCoordsAcrossCpfTables(params: {
  cpf?: string | null;
  email?: string | null;
  address?: string | null;
  street_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
}): Promise<{ updatedTables: string[] }> {
  const client = getDbClient() || supabase;
  if (!client) return { updatedTables: [] };

  const cleanCpf = String(params.cpf || '').replace(/\D/g, '');
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  if (cleanCpf.length !== 11 && !cleanEmail) {
    return { updatedTables: [] };
  }

  const geoPayload: Record<string, any> = {};
  if (params.address !== undefined && params.address !== null) geoPayload.address = params.address;
  if (params.street_number !== undefined && params.street_number !== null) geoPayload.street_number = params.street_number;
  if (params.complement !== undefined && params.complement !== null) geoPayload.complement = params.complement;
  if (params.neighborhood !== undefined && params.neighborhood !== null) geoPayload.neighborhood = params.neighborhood;
  if (params.city !== undefined && params.city !== null) geoPayload.city = params.city;
  if (params.state !== undefined && params.state !== null) geoPayload.state = params.state;
  if (params.cep !== undefined && params.cep !== null) geoPayload.cep = params.cep;
  if (typeof params.latitude === 'number' && !Number.isNaN(params.latitude)) geoPayload.latitude = params.latitude;
  if (typeof params.longitude === 'number' && !Number.isNaN(params.longitude)) geoPayload.longitude = params.longitude;
  if (params.formatted_address) geoPayload.formatted_address = params.formatted_address;
  if (params.google_place_id) geoPayload.google_place_id = params.google_place_id;

  if (Object.keys(geoPayload).length === 0) {
    return { updatedTables: [] };
  }

  const updatedTables: string[] = [];
  const formattedCpf =
    cleanCpf.length === 11
      ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`
      : '';

  const targetTables: Array<{ table: string; cpfCol: string }> = [
    { table: 'salons', cpfCol: 'owner_cpf' },
    { table: 'clients', cpfCol: 'cpf' },
    { table: 'professionals', cpfCol: 'cpf' },
    { table: 'profiles', cpfCol: 'cpf' },
    { table: 'salon_users', cpfCol: 'cpf' },
  ];

  await Promise.all(
    targetTables.map(async ({ table, cpfCol }) => {
      try {
        if (cleanCpf.length === 11) {
          const r1 = await safeSupabaseWrite(table, 'update', geoPayload, {
            matchFilter: { [cpfCol]: cleanCpf },
          });
          if (!r1.error) updatedTables.push(`${table}(${cpfCol}:digits)`);

          if (formattedCpf) {
            await safeSupabaseWrite(table, 'update', geoPayload, {
              matchFilter: { [cpfCol]: formattedCpf },
            });
          }
        } else if (cleanEmail) {
          const rEmail = await safeSupabaseWrite(table, 'update', geoPayload, {
            matchFilter: { email: cleanEmail },
          });
          if (!rEmail.error) updatedTables.push(`${table}(email)`);
        }
      } catch {}
    })
  );

  return { updatedTables };
}

