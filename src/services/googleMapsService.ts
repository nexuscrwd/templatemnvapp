import { LiveRouteCheckpoint, TransportMode as TrackingTransportMode } from '../types';
import { TransportMode as BookingTransportMode } from '../utils/bookingSlots';
import { formatCurrentClockTime } from '../hooks/useLiveRouteTracker';

export interface GoogleRouteStep {
  instruction: string;
  maneuver: string;
  streetName: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}

export interface GoogleComputedRouteResult {
  distanceKm: number;
  etaMinutes: number;
  description: string;
  encodedPolyline: string;
  decodedPath: Array<{ lat: number; lng: number }>;
  steps: GoogleRouteStep[];
  checkpoints: LiveRouteCheckpoint[];
}

export interface GooglePlaceSuggestion {
  id: string;
  title: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export type ModalMatrixMap = Partial<
  Record<
    BookingTransportMode,
    {
      distanceKm: number;
      etaMinutes: number;
      description?: string;
    }
  >
>;

let cachedMapsApiKey: string | null = null;
let mapsScriptLoadPromise: Promise<boolean> | null = null;

/**
 * Obtém a chave do Google Maps Platform a partir do Vite env ou do endpoint seguro /api/maps/config
 */
export async function getGoogleMapsApiKey(): Promise<string> {
  if (cachedMapsApiKey !== null) return cachedMapsApiKey;

  const envKey = (
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''
  ).trim();
  if (envKey) {
    cachedMapsApiKey = envKey;
    return envKey;
  }

  try {
    const res = await fetch('/api/maps/config');
    if (res.ok) {
      const data = await res.json();
      if (data?.apiKey) {
        cachedMapsApiKey = String(data.apiKey).trim();
        return cachedMapsApiKey;
      }
    }
  } catch {}

  cachedMapsApiKey = '';
  return '';
}

/**
 * Carrega o Google Maps JavaScript SDK dinamicamente (com suporte a AdvancedMarkerElement)
 */
export async function loadGoogleMapsJsSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).google?.maps?.Map) return true;
  if (mapsScriptLoadPromise) return mapsScriptLoadPromise;

  mapsScriptLoadPromise = (async () => {
    const apiKey = await getGoogleMapsApiKey();
    if (!apiKey) return false;

    if ((window as any).google?.maps?.Map) return true;

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const safeResolve = (val: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      // Se o Google rejeitar a chave por restrição de referrer ou API desabilitada, gm_authFailure é disparado
      (window as any).gm_authFailure = () => {
        console.warn('[Vagou GPS] Google Maps JS auth failure: chave restrita ou domínio não autorizado.');
        safeResolve(false);
      };

      const checkReady = () => {
        const gmaps = (window as any).google?.maps;
        if (gmaps?.Map) {
          safeResolve(true);
          return true;
        }
        return false;
      };

      if (checkReady()) return;

      const existing = document.getElementById('vagou-google-maps-sdk') as HTMLScriptElement | null;
      if (existing) {
        // Script já adicionado: aguarda inicialização dos módulos internos do Maps
        const startTime = Date.now();
        const poll = setInterval(() => {
          if (checkReady()) {
            clearInterval(poll);
          } else if (Date.now() - startTime > 2500) {
            clearInterval(poll);
            safeResolve(false);
          }
        }, 60);
        return;
      }

      const script = document.createElement('script');
      script.id = 'vagou-google-maps-sdk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&v=weekly&language=pt-BR&region=BR&libraries=marker`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (checkReady()) return;
        const startTime = Date.now();
        const poll = setInterval(() => {
          if (checkReady()) {
            clearInterval(poll);
          } else if (Date.now() - startTime > 2000) {
            clearInterval(poll);
            safeResolve(false);
          }
        }, 50);
      };

      script.onerror = () => safeResolve(false);
      document.head.appendChild(script);

      // Timeout de segurança para não prender a interface caso a rede congele
      setTimeout(() => {
        if (!resolved) {
          safeResolve(Boolean((window as any).google?.maps?.Map));
        }
      }, 3500);
    });
  })();

  return mapsScriptLoadPromise;
}

/**
 * Decodifica uma string encodedPolyline oficial do Google Routes API v2 em coordenadas {lat, lng}[]
 */
export function decodeGooglePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  if (!encoded) return [];
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Converte modalidade do Vagou para o TravelMode oficial da Routes API v2
 */
export function toGoogleTravelMode(
  mode?: BookingTransportMode | TrackingTransportMode
): 'DRIVE' | 'TWO_WHEELER' | 'BICYCLE' | 'WALK' | 'TRANSIT' {
  if (mode === 'walking') return 'WALK';
  if (mode === 'bicycling') return 'BICYCLE';
  if (mode === 'motorcycle') return 'TWO_WHEELER';
  if (mode === 'transit') return 'TRANSIT';
  return 'DRIVE';
}

/**
 * Extrai um nome enxuto de rua/avenida a partir da instrução de navegação do Google Routes API v2
 */
function extractStreetFromInstruction(instruction: string, index: number): string {
  const clean = String(instruction || '')
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' — ')
    .trim();
  if (!clean) return `Trecho ${index + 1} da Rota`;

  // Tenta extrair "na R. ...", "para a Av. ...", "pela Rod. ..."
  const match = clean.match(
    /(?:na|para a|para|pela|pelo|em direção à|em direção a|pegue a|continue na|siga pela)\s+((?:R\.|Rua|Av\.|Avenida|Al\.|Alameda|Pça\.|Praça|Rod\.|Rodovia|Estr\.|Estrada|Marginal|Viaduto|Ponte|Túnel|Largo|Travessa)[^,.—\n]+)/i
  );
  if (match && match[1]) {
    return match[1].trim();
  }

  return clean.length > 64 ? `${clean.slice(0, 61)}...` : clean;
}

/**
 * Calcula rota detalhada real via Routes API v2 (/api/maps/compute-route),
 * retornando distância real, ETA com trânsito, geometria da rota (polyline) e passos reais para a Linha do Tempo
 */
export async function computeGoogleDetailedRoute(params: {
  originLat?: number;
  originLng?: number;
  originAddress?: string;
  destLat?: number;
  destLng?: number;
  destAddress?: string;
  mode?: BookingTransportMode | TrackingTransportMode;
}): Promise<GoogleComputedRouteResult | null> {
  try {
    const travelMode = toGoogleTravelMode(params.mode);
    const res = await fetch('/api/geo/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originLat: params.originLat,
        originLng: params.originLng,
        originAddress: params.originAddress,
        destLat: params.destLat,
        destLng: params.destLng,
        destAddress: params.destAddress,
        travelMode,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;

    const leg = route.legs?.[0];
    const distMeters = Number(route.distanceMeters || leg?.distanceMeters || 0);
    const durSec =
      Number(String(route.duration || leg?.duration || '0s').replace('s', '')) || 0;

    const distanceKm = Math.max(0.2, Number((distMeters / 1000).toFixed(1)));
    const etaMinutes = Math.max(2, Math.ceil(durSec / 60));
    const encodedPolyline = route.polyline?.encodedPolyline || '';
    const decodedPath = decodeGooglePolyline(encodedPolyline);

    const rawSteps: any[] = Array.isArray(leg?.steps) ? leg.steps : [];
    const steps: GoogleRouteStep[] = rawSteps
      .map((s, idx) => {
        const rawInstruction = String(
          s?.navigationInstruction?.instructions || ''
        )
          .replace(/\n+/g, ' • ')
          .trim();
        const maneuver = String(s?.navigationInstruction?.maneuver || 'STRAIGHT');
        const stepMeters = Number(s?.distanceMeters || 0);
        const stepSec =
          Number(String(s?.staticDuration || '0s').replace('s', '')) || 0;
        const distanceText =
          s?.localizedValues?.distance?.text ||
          (stepMeters >= 1000
            ? `${(stepMeters / 1000).toFixed(1)} km`
            : `${Math.max(10, stepMeters)} m`);
        const durationText =
          s?.localizedValues?.staticDuration?.text ||
          `${Math.max(1, Math.round(stepSec / 60))} min`;

        const streetName = extractStreetFromInstruction(rawInstruction, idx);

        return {
          instruction: rawInstruction || streetName,
          maneuver,
          streetName,
          distanceMeters: stepMeters,
          distanceText,
          durationSeconds: stepSec,
          durationText,
          startLat: s?.startLocation?.latLng?.latitude,
          startLng: s?.startLocation?.latLng?.longitude,
          endLat: s?.endLocation?.latLng?.latitude,
          endLng: s?.endLocation?.latLng?.longitude,
        };
      })
      .filter((s) => Boolean(s.instruction));

    const nowClock = formatCurrentClockTime(0);
    const checkpoints: LiveRouteCheckpoint[] = steps.slice(0, 12).map((step, idx) => ({
      street: step.instruction,
      distanceText: step.distanceText,
      status: idx === 0 ? 'current' : 'upcoming',
      timestamp: idx === 0 ? nowClock : undefined,
    }));

    return {
      distanceKm,
      etaMinutes,
      description: route.description ? `via ${route.description}` : 'Rota Google Maps',
      encodedPolyline,
      decodedPath,
      steps,
      checkpoints,
    };
  } catch {
    return null;
  }
}

/**
 * Calcula simultaneamente a matriz dos 5 modais (A pé, Bicicleta, Moto, Carro, Transp. Público) via Routes API v2
 */
export async function fetchGoogleModalRouteMatrix(params: {
  originLat?: number;
  originLng?: number;
  originAddress?: string;
  destLat?: number;
  destLng?: number;
  destAddress?: string;
}): Promise<ModalMatrixMap> {
  try {
    const res = await fetch('/api/maps/route-matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return (data?.modes || {}) as ModalMatrixMap;
  } catch {
    return {};
  }
}

/**
 * Busca sugestões reais de endereços, ruas e estabelecimentos via Places API (New v1)
 */
export async function searchGooglePlacesSuggestions(
  query: string
): Promise<GooglePlaceSuggestion[]> {
  const clean = String(query || '').trim();
  if (clean.length < 3) return [];

  try {
    const res = await fetch('/api/maps/places-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: clean }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.places)) return [];
    return data.places.filter(
      (p: any) => typeof p?.lat === 'number' && typeof p?.lng === 'number'
    );
  } catch {
    return [];
  }
}

/**
 * Faz o Snap-to-Road via Roads API + Reverse Geocode via Geocoding API para uma coordenada GPS ao vivo
 */
export async function snapAndReverseGeocodeGps(
  lat: number,
  lng: number
): Promise<{ lat: number; lng: number; streetName: string; formattedAddress: string } | null> {
  try {
    const res = await fetch(
      `/api/maps/snap-and-reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Geocodificação em 3 Camadas (/api/geo/geocode: Google Geocoding API com Referer ➔ Nominatim ➔ BrasilAPI v2)
 */
export async function geocodeAddressThreeLayers(params: {
  address?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
  googlePlaceId?: string;
  source: string;
} | null> {
  try {
    const res = await fetch('/api/geo/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

