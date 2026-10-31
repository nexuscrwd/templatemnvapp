import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  RotateCcw,
  ExternalLink,
  Compass,
  Loader2,
} from 'lucide-react';
import {
  GoogleComputedRouteResult,
  snapAndReverseGeocodeGps,
  decodeGooglePolyline,
} from '../../services/googleMapsService';
import { isValidAvatarUrlString } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { hapticLight } from '../../utils/haptics';

interface InteractiveGoogleRouteMapProps {
  originLat?: number;
  originLng?: number;
  originLabel: string;
  destLat?: number;
  destLng?: number;
  destLabel: string;
  userAvatarUrl?: string;
  routeData: GoogleComputedRouteResult | null;
  initialDistanceKm: number;
  initialEtaMinutes: number;
  fallbackEmbedUrl?: string;
  onLiveGpsUpdate?: (lat: number, lng: number, snappedStreetName?: string) => void;
  onDestinationReachedChange?: (reached: boolean) => void;
}

function computeHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeRoadDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const straightKm = computeHaversineKm(lat1, lng1, lat2, lng2);
  if (straightKm < 0.05) return 0;
  return Number((straightKm * 1.35).toFixed(1));
}

function computeBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = (Math.atan2(y, x) * 180) / Math.PI;
  return (theta + 360) % 360;
}

function projectPointAhead(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number
): { lat: number; lng: number } {
  const R = 6371;
  const dByR = distanceKm / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) +
      Math.cos(lat1) * Math.sin(dByR) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dByR) * Math.cos(lat1),
      Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

function smoothAngleDeg(currentDeg: number, targetDeg: number, factor = 0.3): number {
  const diff = ((((targetDeg - currentDeg) % 360) + 540) % 360) - 180;
  return (currentDeg + diff * factor + 360) % 360;
}

function angleDiffDeg(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

/**
 * Map-Matching Ortogonal Contínuo (Snap-to-Polyline):
 * Projeta a coordenada do usuário ortogonalmente no segmento viário mais próximo,
 * eliminando desvios laterais do GPS e calculando o azimute (bearing) exato da rua à frente.
 * GARANTIA ZERO LINHA RETA: Jamais retorna um segmento reto de 2 pontos [user, dest].
 */
function findForwardRouteBearingAndRemainingPath(
  userLat: number,
  userLng: number,
  roadPath: Array<{ lat: number; lng: number }>,
  destLat: number,
  destLng: number
): {
  forwardBearingDeg: number;
  snappedLat: number;
  snappedLng: number;
  remainingPath: Array<{ lat: number; lng: number }>;
  closestIndex: number;
  isOffRoute: boolean;
} {
  if (!roadPath || roadPath.length <= 2) {
    return {
      forwardBearingDeg: computeBearingDeg(userLat, userLng, destLat, destLng),
      snappedLat: userLat,
      snappedLng: userLng,
      remainingPath: [],
      closestIndex: 0,
      isOffRoute: true,
    };
  }

  const cosLat = Math.cos((userLat * Math.PI) / 180);
  let bestSegIdx = 0;
  let bestProjLat = roadPath[0].lat;
  let bestProjLng = roadPath[0].lng;
  let minDistKm = Infinity;

  for (let i = 0; i < roadPath.length - 1; i++) {
    const A = roadPath[i];
    const B = roadPath[i + 1];
    const dx = (B.lng - A.lng) * cosLat;
    const dy = B.lat - A.lat;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 1e-12) {
      const px = (userLng - A.lng) * cosLat;
      const py = userLat - A.lat;
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
    }

    const projLat = A.lat + t * (B.lat - A.lat);
    const projLng = A.lng + t * (B.lng - A.lng);
    const d = computeHaversineKm(userLat, userLng, projLat, projLng);

    if (d < minDistKm) {
      minDistKm = d;
      bestSegIdx = i;
      bestProjLat = projLat;
      bestProjLng = projLng;
    }
  }

  // Se o GPS real do usuário estiver a mais de 220m da rota calculada originalmente,
  // sinaliza recálculo viário mantendo a geometria atual até a nova rota chegar (sem linha reta).
  if (minDistKm > 0.22) {
    const nextPt = roadPath[Math.min(1, roadPath.length - 1)];
    return {
      forwardBearingDeg: computeBearingDeg(
        roadPath[0].lat,
        roadPath[0].lng,
        nextPt.lat,
        nextPt.lng
      ),
      snappedLat: userLat,
      snappedLng: userLng,
      remainingPath: roadPath,
      closestIndex: 0,
      isOffRoute: true,
    };
  }

  // Snap-to-road: se estiver dentro de 55m da via, ancora o ponto na linha central da rua
  const effectiveLat = minDistKm <= 0.055 ? bestProjLat : userLat;
  const effectiveLng = minDistKm <= 0.055 ? bestProjLng : userLng;

  // Procura ponto ~45m à frente ao longo dos segmentos da própria via para obter bearing 100% estável
  let targetAheadLat = roadPath[roadPath.length - 1].lat;
  let targetAheadLng = roadPath[roadPath.length - 1].lng;
  let accumKm = 0;
  let curLat = bestProjLat;
  let curLng = bestProjLng;

  for (let j = bestSegIdx + 1; j < roadPath.length; j++) {
    const pt = roadPath[j];
    const segKm = computeHaversineKm(curLat, curLng, pt.lat, pt.lng);
    if (accumKm + segKm >= 0.045) {
      const remainKm = 0.045 - accumKm;
      const ratio = segKm > 0.0001 ? Math.min(1, Math.max(0, remainKm / segKm)) : 1;
      targetAheadLat = curLat + ratio * (pt.lat - curLat);
      targetAheadLng = curLng + ratio * (pt.lng - curLng);
      break;
    }
    accumKm += segKm;
    curLat = pt.lat;
    curLng = pt.lng;
  }

  const bearingAlongRoad = computeBearingDeg(
    bestProjLat,
    bestProjLng,
    targetAheadLat,
    targetAheadLng
  );

  const tailPoints = roadPath.slice(bestSegIdx + 1);
  const remainingSlice =
    tailPoints.length >= 2
      ? [{ lat: effectiveLat, lng: effectiveLng }, ...tailPoints]
      : [
          { lat: effectiveLat, lng: effectiveLng },
          roadPath[Math.max(0, roadPath.length - 2)],
          roadPath[roadPath.length - 1],
        ];

  return {
    forwardBearingDeg: bearingAlongRoad,
    snappedLat: effectiveLat,
    snappedLng: effectiveLng,
    remainingPath: remainingSlice,
    closestIndex: bestSegIdx,
    isOffRoute: false,
  };
}

function formatCountdownHhMm(totalMinutes: number): string {
  const safeMin = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMin / 60);
  const mins = safeMin % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function createPinBadge(bgHex: string, textHex: string, labelText: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.background = bgHex;
  el.style.color = textHex;
  el.style.padding = '3px 7px';
  el.style.borderRadius = '4px';
  el.style.fontWeight = '800';
  el.style.fontSize = '10.5px';
  el.style.fontFamily = 'Poppins, sans-serif';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
  el.style.whiteSpace = 'nowrap';
  el.style.transform = 'rotate(var(--map-counter-rotate, 0deg))';
  el.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';
  el.textContent = labelText;
  return el;
}

function resolveActiveUserAvatarUrl(propAvatarUrl?: string): string {
  if (isValidAvatarUrlString(propAvatarUrl)) {
    return propAvatarUrl.trim();
  }
  if (typeof window !== 'undefined') {
    const savedAvatar = localStorage.getItem('vagou_user_avatar') || '';
    if (isValidAvatarUrlString(savedAvatar)) {
      return savedAvatar.trim();
    }
    try {
      const savedProfile = JSON.parse(localStorage.getItem('vagou_user_profile') || '{}');
      if (isValidAvatarUrlString(savedProfile?.avatarUrl)) {
        return savedProfile.avatarUrl.trim();
      }
    } catch {}
  }
  return '';
}

function createDirectionalUserMarkerElement(avatarUrl?: string): {
  container: HTMLDivElement;
  rotor: HTMLDivElement;
} {
  const hasValidPhoto = isValidAvatarUrlString(avatarUrl);

  const container = document.createElement('div');
  container.style.width = '56px';
  container.style.height = '56px';
  container.style.position = 'relative';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.pointerEvents = 'none';

  const rotor = document.createElement('div');
  rotor.className = 'vagou-nav-rotor';
  rotor.style.position = 'relative';
  rotor.style.width = '56px';
  rotor.style.height = '56px';
  rotor.style.display = 'flex';
  rotor.style.alignItems = 'center';
  rotor.style.justifyContent = 'center';
  rotor.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
  rotor.style.transformOrigin = '50% 50%';

  const visionCone = document.createElement('div');
  visionCone.style.position = 'absolute';
  visionCone.style.top = '-16px';
  visionCone.style.left = '50%';
  visionCone.style.transform = 'translateX(-50%)';
  visionCone.style.width = '42px';
  visionCone.style.height = '40px';
  visionCone.style.background =
    'linear-gradient(to top, rgba(16, 185, 129, 0.55) 0%, rgba(16, 185, 129, 0.0) 100%)';
  visionCone.style.clipPath = 'polygon(0% 0%, 100% 0%, 65% 100%, 35% 100%)';
  visionCone.style.borderRadius = '50% 50% 0 0';

  const defaultPuck = document.createElement('div');
  defaultPuck.style.position = 'relative';
  defaultPuck.style.width = '26px';
  defaultPuck.style.height = '26px';
  defaultPuck.style.borderRadius = '9999px';
  defaultPuck.style.background = '#10b981';
  defaultPuck.style.border = '3px solid #ffffff';
  defaultPuck.style.boxShadow =
    '0 3px 12px rgba(0, 0, 0, 0.45), 0 0 0 4px rgba(16, 185, 129, 0.35)';
  defaultPuck.style.display = hasValidPhoto ? 'none' : 'flex';
  defaultPuck.style.alignItems = 'center';
  defaultPuck.style.justifyContent = 'center';

  const arrow = document.createElement('div');
  arrow.style.width = '0';
  arrow.style.height = '0';
  arrow.style.borderLeft = '5px solid transparent';
  arrow.style.borderRight = '5px solid transparent';
  arrow.style.borderBottom = '9px solid #ffffff';
  arrow.style.transform = 'translateY(-1px)';

  defaultPuck.appendChild(arrow);
  rotor.appendChild(visionCone);
  rotor.appendChild(defaultPuck);

  if (hasValidPhoto && avatarUrl) {
    const directionTip = document.createElement('div');
    directionTip.style.position = 'absolute';
    directionTip.style.top = '1px';
    directionTip.style.left = '50%';
    directionTip.style.transform = 'translateX(-50%)';
    directionTip.style.width = '0';
    directionTip.style.height = '0';
    directionTip.style.borderLeft = '6px solid transparent';
    directionTip.style.borderRight = '6px solid transparent';
    directionTip.style.borderBottom = '10px solid #10b981';
    directionTip.style.filter = 'drop-shadow(0 -1px 2px rgba(255,255,255,0.95))';
    rotor.appendChild(directionTip);

    const avatarBadge = document.createElement('div');
    avatarBadge.style.position = 'absolute';
    avatarBadge.style.width = '34px';
    avatarBadge.style.height = '34px';
    avatarBadge.style.borderRadius = '9999px';
    avatarBadge.style.border = '2.5px solid #10b981';
    avatarBadge.style.boxShadow =
      '0 2px 10px rgba(0, 0, 0, 0.45), 0 0 0 2px #ffffff, 0 0 0 5px rgba(16, 185, 129, 0.3)';
    avatarBadge.style.background = '#0f172a';
    avatarBadge.style.overflow = 'hidden';
    avatarBadge.style.display = 'flex';
    avatarBadge.style.alignItems = 'center';
    avatarBadge.style.justifyContent = 'center';
    avatarBadge.style.zIndex = '2';
    // Contra-rotação automática para manter a foto do usuário sempre em pé (0° vertical na tela)
    avatarBadge.style.transform = 'rotate(var(--map-counter-rotate, 0deg))';
    avatarBadge.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';

    const img = document.createElement('img');
    img.src = avatarUrl.trim();
    img.alt = 'Sua Posição';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    img.onerror = () => {
      avatarBadge.style.display = 'none';
      directionTip.style.display = 'none';
      defaultPuck.style.display = 'flex';
    };

    avatarBadge.appendChild(img);
    container.appendChild(rotor);
    container.appendChild(avatarBadge);
  } else {
    container.appendChild(rotor);
  }

  return { container, rotor };
}

export const InteractiveGoogleRouteMap: React.FC<InteractiveGoogleRouteMapProps> = ({
  originLat = -23.5505,
  originLng = -46.6333,
  destLat = -23.5621,
  destLng = -46.4795,
  destLabel,
  userAvatarUrl,
  routeData,
  initialDistanceKm,
  initialEtaMinutes,
  onLiveGpsUpdate,
  onDestinationReachedChange,
}) => {
  const { isDark } = useTheme();
  const effectiveUserAvatar = useMemo(
    () => resolveActiveUserAvatarUrl(userAvatarUrl),
    [userAvatarUrl]
  );

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Instâncias persistentes do Leaflet Map
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletTileLayerRef = useRef<L.TileLayer | null>(null);
  const leafletOuterPolylineRef = useRef<L.Polyline | null>(null);
  const leafletInnerPolylineRef = useRef<L.Polyline | null>(null);
  const leafletOriginMarkerRef = useRef<L.Marker | null>(null);
  const leafletDestMarkerRef = useRef<L.Marker | null>(null);
  const leafletUserMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRotorRef = useRef<HTMLDivElement | null>(null);

  const [isFollowingGps, setIsFollowingGps] = useState<boolean>(true);
  // Course-Up (Modo Navegação Vertical): gira o mapa para que o sentido da via fique sempre para CIMA (0° vertical)
  const [isCourseUp, setIsCourseUp] = useState<boolean>(true);
  const isCourseUpRef = useRef<boolean>(true);
  isCourseUpRef.current = isCourseUp;

  const [mapBearingDeg, setMapBearingDeg] = useState<number>(0);
  const mapBearingDegRef = useRef<number>(0);
  const [isTouchInteracting, setIsTouchInteracting] = useState<boolean>(false);

  const [isCalculatingRoad, setIsCalculatingRoad] = useState<boolean>(true);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [activeManeuver, setActiveManeuver] = useState<{
    instruction: string;
    distanceText: string;
    maneuver: string;
  }>({
    instruction: `Em direção a ${destLabel}`,
    distanceText: 'Em rota',
    maneuver: 'STRAIGHT',
  });

  const roadPathRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const lastGpsFixRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const lastSnappedApiTsRef = useRef<number>(0);
  const lastRerouteTsRef = useRef<number>(0);
  const hasActiveGpsFollowRef = useRef<boolean>(true);
  const userManualPanUntilRef = useRef<number>(0);

  const forwardHeadingRef = useRef<number>(
    computeBearingDeg(originLat, originLng, destLat, destLng)
  );
  const routeLookAheadBearingRef = useRef<number>(
    computeBearingDeg(originLat, originLng, destLat, destLng)
  );
  const liveUserPosRef = useRef<{ lat: number; lng: number }>({
    lat: originLat,
    lng: originLng,
  });

  const onLiveGpsUpdateRef = useRef(onLiveGpsUpdate);
  onLiveGpsUpdateRef.current = onLiveGpsUpdate;

  const onDestinationReachedRef = useRef(onDestinationReachedChange);
  onDestinationReachedRef.current = onDestinationReachedChange;

  const baseDistanceKm = routeData?.distanceKm ?? initialDistanceKm ?? 3.2;
  const baseEtaMinutes = routeData?.etaMinutes ?? initialEtaMinutes ?? 14;

  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number>(baseDistanceKm);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(baseEtaMinutes);

  useEffect(() => {
    setRemainingDistanceKm(baseDistanceKm);
    setRemainingMinutes(baseEtaMinutes);
  }, [baseDistanceKm, baseEtaMinutes]);

  const hasReachedDestination = remainingDistanceKm <= 0.15 || remainingMinutes <= 0;

  useEffect(() => {
    onDestinationReachedRef.current?.(hasReachedDestination);
  }, [hasReachedDestination]);

  /**
   * Sincronização de Posição, Direção e Rotação Vertical (Course-Up):
   * - Gira o estágio do mapa por -roadBearingDeg para que a avenida à frente aponte SEMPRE para CIMA (0° vertical).
   * - Desliza o mapa suavemente na vertical conforme o usuário avança.
   * - Zero tremor: só move a câmera (panTo) quando há deslocamento real ou recenter.
   */
  const syncPositionAndOrientation = useCallback(
    (
      userLat: number,
      userLng: number,
      headingDeg: number,
      shouldPanCamera: boolean,
      forceInstant = false
    ) => {
      liveUserPosRef.current = { lat: userLat, lng: userLng };

      const lmap = leafletMapRef.current;
      if (!lmap) return;

      // 1. Atualiza posição do marcador do usuário
      if (leafletUserMarkerRef.current) {
        leafletUserMarkerRef.current.setLatLng([userLat, userLng]);
      }

      // 2. Gira a ponteira e cone de visão no espaço do mapa
      if (userMarkerRotorRef.current) {
        userMarkerRotorRef.current.style.transform = `rotate(${headingDeg.toFixed(1)}deg)`;
      }

      // 3. Atualiza rotação Course-Up do mapa se o modo vertical estiver ativo
      const isManualPan = Date.now() < userManualPanUntilRef.current;
      const roadCourse = routeLookAheadBearingRef.current;

      if (!isManualPan) {
        const targetMapBearing = isCourseUpRef.current ? roadCourse : 0;
        if (
          forceInstant ||
          angleDiffDeg(targetMapBearing, mapBearingDegRef.current) >= 1.2
        ) {
          const nextMapBearing = forceInstant
            ? targetMapBearing
            : smoothAngleDeg(mapBearingDegRef.current, targetMapBearing, 0.45);
          mapBearingDegRef.current = nextMapBearing;
          setMapBearingDeg(nextMapBearing);
        }
      }

      // 4. Projeta a câmera ~55m à frente na direção exata da via (para que o ícone fique na metade inferior e a pista suba na vertical)
      if (shouldPanCamera && !isManualPan) {
        const lookAheadCenter = projectPointAhead(userLat, userLng, roadCourse, 0.055);
        try {
          lmap.panTo([lookAheadCenter.lat, lookAheadCenter.lng], {
            animate: !forceInstant,
            duration: forceInstant ? 0 : 0.55,
            easeLinearity: 0.25,
          });
        } catch {}
      }
    },
    []
  );

  /**
   * Inicialização ÚNICA do motor de mapa com Zoom Inteiro (Zero Costuras/Linhas de Grade)
   * Desativa o arrasto nativo do Leaflet para usar o controlador de gestos rotacionado (1 dedo pan + 2 dedos giro/zoom).
   */
  useEffect(() => {
    const containerEl = mapContainerRef.current;
    if (!containerEl) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const initialPos = liveUserPosRef.current;
    const lmap = L.map(containerEl, {
      center: [initialPos.lat, initialPos.lng],
      zoom: 17,
      zoomSnap: 1,
      zoomDelta: 1,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      attributionControl: false,
    });

    const tileProviders = [
      {
        url: 'https://mt{s}.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}',
        subdomains: ['0', '1', '2', '3'],
      },
      {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
      },
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        subdomains: ['a'],
      },
    ];

    let currentProviderIdx = 0;
    let consecutiveTileErrors = 0;

    const mountTileLayer = (providerIdx: number) => {
      const provider = tileProviders[providerIdx] || tileProviders[0];
      if (leafletTileLayerRef.current) {
        try {
          lmap.removeLayer(leafletTileLayerRef.current);
        } catch {}
      }
      const layer = L.tileLayer(provider.url, {
        subdomains: provider.subdomains,
        maxZoom: 20,
        keepBuffer: 4,
        updateWhenIdle: false,
      });

      layer.on('tileload', () => {
        consecutiveTileErrors = 0;
      });

      layer.on('tileerror', () => {
        consecutiveTileErrors += 1;
        if (consecutiveTileErrors >= 4 && currentProviderIdx < tileProviders.length - 1) {
          consecutiveTileErrors = 0;
          currentProviderIdx += 1;
          mountTileLayer(currentProviderIdx);
        }
      });

      layer.addTo(lmap);
      leafletTileLayerRef.current = layer;
    };

    mountTileLayer(0);

    // Linha de rota dupla (outer dark glow + inner emerald road)
    const outerPoly = L.polyline([], {
      color: '#064e3b',
      weight: 9,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(lmap);

    const innerPoly = L.polyline([], {
      color: '#10b981',
      weight: 5.5,
      opacity: 1.0,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(lmap);

    leafletOuterPolylineRef.current = outerPoly;
    leafletInnerPolylineRef.current = innerPoly;

    // Marcador de Saída
    const originIcon = L.divIcon({
      html: createPinBadge(
        isDark ? '#0f172a' : '#ffffff',
        isDark ? '#ffffff' : '#0f172a',
        'Saída'
      ),
      className: 'vagou-leaflet-badge',
      iconSize: [60, 24],
      iconAnchor: [30, 12],
    });
    leafletOriginMarkerRef.current = L.marker([originLat, originLng], {
      icon: originIcon,
    }).addTo(lmap);

    // Marcador de Destino
    const destIcon = L.divIcon({
      html: createPinBadge('#10b981', '#ffffff', destLabel.slice(0, 22)),
      className: 'vagou-leaflet-badge',
      iconSize: [120, 24],
      iconAnchor: [60, 12],
    });
    leafletDestMarkerRef.current = L.marker([destLat, destLng], {
      icon: destIcon,
    }).addTo(lmap);

    // Marcador Direcional do Usuário (Avatar com anel esmeralda e rotor)
    const { container, rotor } = createDirectionalUserMarkerElement(effectiveUserAvatar);
    userMarkerRotorRef.current = rotor;
    const userDivIcon = L.divIcon({
      html: container,
      className: 'vagou-leaflet-user-puck',
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });
    leafletUserMarkerRef.current = L.marker([initialPos.lat, initialPos.lng], {
      icon: userDivIcon,
      zIndexOffset: 1000,
    }).addTo(lmap);

    leafletMapRef.current = lmap;

    const invalidateTimer = window.setTimeout(() => {
      try {
        lmap.invalidateSize();
      } catch {}
    }, 120);

    let resizeObs: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => {
        try {
          lmap.invalidateSize();
        } catch {}
      });
      resizeObs.observe(containerEl);
    }

    if (roadPathRef.current.length > 2) {
      const latlngs = roadPathRef.current.map((p) => [p.lat, p.lng] as [number, number]);
      outerPoly.setLatLngs(latlngs);
      innerPoly.setLatLngs(latlngs);
    }

    return () => {
      window.clearTimeout(invalidateTimer);
      resizeObs?.disconnect();
      lmap.remove();
      leafletMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  /**
   * Controlador de Gestos Rotacionado (1 Dedo Arrastar no sentido real da tela + 2 Dedos Girar Mapa e Zoom)
   */
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    let isDraggingOneFinger = false;
    let lastX = 0;
    let lastY = 0;
    let totalDragDist = 0;

    let isTwoFingerGesture = false;
    let lastTwoFingerAngle = 0;
    let lastTwoFingerDist = 0;

    const panMapInScreenSpace = (dxScreen: number, dyScreen: number) => {
      const lmap = leafletMapRef.current;
      if (!lmap) return;
      // Converte o vetor de arrasto da tela (dxScreen, dyScreen) para o sistema de coordenadas rotacionado do mapa
      const rad = (mapBearingDegRef.current * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const dxMap = dxScreen * cosA - dyScreen * sinA;
      const dyMap = dxScreen * sinA + dyScreen * cosA;
      lmap.panBy([-dxMap, -dyMap], { animate: false });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest('button, a')) return;

      if (e.touches.length === 1) {
        isDraggingOneFinger = true;
        isTwoFingerGesture = false;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        totalDragDist = 0;
      } else if (e.touches.length >= 2) {
        isDraggingOneFinger = false;
        isTwoFingerGesture = true;
        setIsTouchInteracting(true);
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        lastTwoFingerAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        lastTwoFingerDist = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingOneFinger && e.touches.length === 1) {
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        const dx = curX - lastX;
        const dy = curY - lastY;
        lastX = curX;
        lastY = curY;
        totalDragDist += Math.hypot(dx, dy);

        if (totalDragDist > 8) {
          if (e.cancelable) e.preventDefault();
          userManualPanUntilRef.current = Date.now() + 8000;
          hasActiveGpsFollowRef.current = false;
          setIsFollowingGps(false);
          setIsTouchInteracting(true);
          panMapInScreenSpace(dx, dy);
        }
      } else if (isTwoFingerGesture && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        userManualPanUntilRef.current = Date.now() + 8000;
        hasActiveGpsFollowRef.current = false;
        setIsFollowingGps(false);

        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const curAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const curDist = Math.hypot(dx, dy);

        // Giro de 2 dedos
        const deltaAngle = ((((curAngle - lastTwoFingerAngle) % 360) + 540) % 360) - 180;
        lastTwoFingerAngle = curAngle;
        const nextBearing = (mapBearingDegRef.current - deltaAngle + 360) % 360;
        mapBearingDegRef.current = nextBearing;
        setMapBearingDeg(nextBearing);

        // Pinça de zoom em degraus inteiros (sem zoom fracionado que gera linhas)
        const lmap = leafletMapRef.current;
        if (lmap && Math.abs(curDist - lastTwoFingerDist) > 42) {
          const zoomDelta = curDist > lastTwoFingerDist ? 1 : -1;
          lastTwoFingerDist = curDist;
          lmap.setZoom(Math.min(19, Math.max(12, lmap.getZoom() + zoomDelta)));
        }
      }
    };

    const handleTouchEnd = () => {
      isDraggingOneFinger = false;
      isTwoFingerGesture = false;
      setIsTouchInteracting(false);
    };

    // Suporte para arrasto com mouse em desktop
    let isMouseDown = false;
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement)?.closest('button, a')) return;
      isMouseDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      totalDragDist = 0;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      totalDragDist += Math.hypot(dx, dy);
      if (totalDragDist > 6) {
        userManualPanUntilRef.current = Date.now() + 8000;
        hasActiveGpsFollowRef.current = false;
        setIsFollowingGps(false);
        setIsTouchInteracting(true);
        panMapInScreenSpace(dx, dy);
      }
    };

    const handleMouseUp = () => {
      if (isMouseDown) {
        isMouseDown = false;
        setIsTouchInteracting(false);
      }
    };

    viewportEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewportEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    viewportEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    viewportEl.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    viewportEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      viewportEl.removeEventListener('touchstart', handleTouchStart);
      viewportEl.removeEventListener('touchmove', handleTouchMove);
      viewportEl.removeEventListener('touchend', handleTouchEnd);
      viewportEl.removeEventListener('touchcancel', handleTouchEnd);
      viewportEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Atualiza ícone do destino ou avatar sem recriar o mapa
  useEffect(() => {
    if (leafletDestMarkerRef.current) {
      const destIcon = L.divIcon({
        html: createPinBadge('#10b981', '#ffffff', destLabel.slice(0, 22)),
        className: 'vagou-leaflet-badge',
        iconSize: [120, 24],
        iconAnchor: [60, 12],
      });
      leafletDestMarkerRef.current.setIcon(destIcon);
    }
  }, [destLabel]);

  useEffect(() => {
    if (leafletUserMarkerRef.current) {
      const { container, rotor } = createDirectionalUserMarkerElement(effectiveUserAvatar);
      userMarkerRotorRef.current = rotor;
      rotor.style.transform = `rotate(${forwardHeadingRef.current.toFixed(1)}deg)`;
      const userDivIcon = L.divIcon({
        html: container,
        className: 'vagou-leaflet-user-puck',
        iconSize: [56, 56],
        iconAnchor: [28, 28],
      });
      leafletUserMarkerRef.current.setIcon(userDivIcon);
    }
  }, [effectiveUserAvatar]);

  /**
   * Aplicação da geometria viária da rota (Exige > 2 pontos — Proibido Linha Reta)
   */
  const applyRoadGeometry = useCallback(
    (roadPath: Array<{ lat: number; lng: number }>) => {
      if (!roadPath || roadPath.length <= 2) return;
      roadPathRef.current = roadPath;
      setIsCalculatingRoad(false);

      const startPt = roadPath[0];
      const endPt = roadPath[roadPath.length - 1];
      const currentPos = liveUserPosRef.current;

      const { forwardBearingDeg, snappedLat, snappedLng, remainingPath } =
        findForwardRouteBearingAndRemainingPath(
          currentPos.lat,
          currentPos.lng,
          roadPath,
          endPt.lat,
          endPt.lng
        );

      const polyToDraw = remainingPath.length > 2 ? remainingPath : roadPath;

      routeLookAheadBearingRef.current = forwardBearingDeg;
      forwardHeadingRef.current = forwardBearingDeg;

      if (leafletOuterPolylineRef.current) {
        leafletOuterPolylineRef.current.setLatLngs(
          polyToDraw.map((p) => [p.lat, p.lng] as [number, number])
        );
      }
      if (leafletInnerPolylineRef.current) {
        leafletInnerPolylineRef.current.setLatLngs(
          polyToDraw.map((p) => [p.lat, p.lng] as [number, number])
        );
      }
      if (leafletOriginMarkerRef.current) {
        leafletOriginMarkerRef.current.setLatLng([startPt.lat, startPt.lng]);
      }
      if (leafletDestMarkerRef.current) {
        leafletDestMarkerRef.current.setLatLng([endPt.lat, endPt.lng]);
      }

      syncPositionAndOrientation(
        snappedLat,
        snappedLng,
        forwardBearingDeg,
        true,
        true
      );

      if (routeData?.steps && routeData.steps.length > 0) {
        const step = routeData.steps[0];
        setActiveManeuver({
          instruction: step.instruction,
          distanceText: step.distanceText,
          maneuver: step.maneuver,
        });
      }
    },
    [syncPositionAndOrientation, routeData]
  );

  /**
   * Função reutilizável para buscar malha viária real (Backend 5-Layer Cascade + FOSSGIS OSRM + Global OSRM)
   * Jamais desenha linha reta de 2 pontos.
   */
  const fetchRealRoadNetwork = useCallback(
    async (startLat: number, startLng: number, targetLat: number, targetLng: number) => {
      setIsCalculatingRoad(true);

      try {
        const routeRes = await fetch('/api/geo/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originLat: startLat,
            originLng: startLng,
            destLat: targetLat,
            destLng: targetLng,
            destAddress: destLabel,
            travelMode: 'DRIVE',
          }),
        });
        if (routeRes.ok) {
          const routeJson = await routeRes.json();
          const encoded = routeJson?.routes?.[0]?.polyline?.encodedPolyline;
          if (encoded) {
            const pts = decodeGooglePolyline(encoded);
            if (pts.length > 2) {
              applyRoadGeometry(pts);
              return true;
            }
          }
        }
      } catch {}

      const directOsrmUrls = [
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${targetLng},${targetLat}?overview=full&geometries=polyline`,
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${targetLng},${targetLat}?overview=full&geometries=polyline`,
      ];

      for (const osrmUrl of directOsrmUrls) {
        try {
          const res = await fetch(osrmUrl);
          if (res.ok) {
            const data = await res.json();
            const encoded = data?.routes?.[0]?.geometry;
            if (encoded) {
              const pts = decodeGooglePolyline(encoded);
              if (pts.length > 2) {
                applyRoadGeometry(pts);
                return true;
              }
            }
          }
        } catch {}
      }

      setIsCalculatingRoad(false);
      return false;
    },
    [applyRoadGeometry, destLabel]
  );

  /**
   * Cálculo viário real ao abrir ou receber routeData
   */
  useEffect(() => {
    let active = true;

    const initRoadGeometry = async () => {
      if (routeData?.decodedPath && routeData.decodedPath.length > 2) {
        applyRoadGeometry(routeData.decodedPath);
        const firstPt = routeData.decodedPath[0];
        const distFromGpsKm = computeHaversineKm(
          liveUserPosRef.current.lat,
          liveUserPosRef.current.lng,
          firstPt.lat,
          firstPt.lng
        );
        if (distFromGpsKm <= 0.35) {
          return;
        }
      }

      if (!active) return;
      await fetchRealRoadNetwork(
        liveUserPosRef.current.lat,
        liveUserPosRef.current.lng,
        destLat,
        destLng
      );
    };

    initRoadGeometry();

    return () => {
      active = false;
    };
  }, [routeData, destLat, destLng, applyRoadGeometry, fetchRealRoadNetwork]);

  /**
   * Bússola do celular (DeviceOrientation) — ESTABILIZADA (ZERO TREMOR):
   * - JAMAIS chama panTo na câmera (o que causava o mapa tremer/chacoalhar no vídeo).
   * - No modo Course-Up em rota, mantém a seta travada no alinhamento da via à frente (apontando para CIMA).
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastCompassTs = 0;

    const handleOrientation = (event: any) => {
      const now = Date.now();
      if (now - lastCompassTs < 250) return;

      // Quando em navegação Course-Up seguindo a via, trava a ponteira no azimute da pista
      // para que a seta aponte sempre 100% para CIMA na vertical sem oscilar com o magnetômetro.
      if (isCourseUpRef.current && hasActiveGpsFollowRef.current) {
        if (userMarkerRotorRef.current) {
          userMarkerRotorRef.current.style.transform = `rotate(${routeLookAheadBearingRef.current.toFixed(1)}deg)`;
        }
        return;
      }

      let rawHeading: number | null = null;
      if (
        typeof event.webkitCompassHeading === 'number' &&
        !Number.isNaN(event.webkitCompassHeading)
      ) {
        rawHeading = event.webkitCompassHeading;
      } else if (typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
        const screenAngle =
          typeof window.screen?.orientation?.angle === 'number'
            ? window.screen.orientation.angle
            : 0;
        rawHeading = (360 - event.alpha + screenAngle + 360) % 360;
      }

      if (rawHeading === null) return;
      lastCompassTs = now;

      const nextHeading = smoothAngleDeg(forwardHeadingRef.current, rawHeading, 0.2);
      if (angleDiffDeg(nextHeading, forwardHeadingRef.current) < 4.5) return;

      forwardHeadingRef.current = nextHeading;
      if (userMarkerRotorRef.current) {
        userMarkerRotorRef.current.style.transform = `rotate(${nextHeading.toFixed(1)}deg)`;
      }
    };

    window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  /**
   * Rastreamento GPS ao vivo contínuo com Map-Matching Ortogonal e Deslizamento Vertical
   */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const avgMinutesPerKm = baseDistanceKm > 0 ? baseEtaMinutes / baseDistanceKm : 4.2;

    const handleGpsFix = async (pos: GeolocationPosition, isInitial = false) => {
      const rawLat = pos.coords.latitude;
      const rawLng = pos.coords.longitude;
      const gpsSpeed = pos.coords.speed ?? 0;

      const kmh = Math.max(0, Math.round(gpsSpeed * 3.6));
      setCurrentSpeedKmh(kmh);

      const prev = lastGpsFixRef.current;
      const now = Date.now();
      const movedMeters = prev
        ? computeHaversineKm(prev.lat, prev.lng, rawLat, rawLng) * 1000
        : 9999;

      // Filtro anti-tremor para GPS parado: ignora micro-oscilações menores que 4.5 metros
      if (!isInitial && prev && movedMeters < 4.5 && now - prev.ts < 4000) {
        return;
      }

      lastGpsFixRef.current = { lat: rawLat, lng: rawLng, ts: now };

      // 1. Projeta posição ortogonalmente na malha viária (Map-Matching)
      const {
        forwardBearingDeg,
        snappedLat,
        snappedLng,
        remainingPath,
        closestIndex,
        isOffRoute,
      } = findForwardRouteBearingAndRemainingPath(
        rawLat,
        rawLng,
        roadPathRef.current,
        destLat,
        destLng
      );

      liveUserPosRef.current = { lat: snappedLat, lng: snappedLng };
      routeLookAheadBearingRef.current = forwardBearingDeg;
      forwardHeadingRef.current = forwardBearingDeg;

      if (remainingPath.length > 2) {
        leafletOuterPolylineRef.current?.setLatLngs(
          remainingPath.map((p) => [p.lat, p.lng] as [number, number])
        );
        leafletInnerPolylineRef.current?.setLatLngs(
          remainingPath.map((p) => [p.lat, p.lng] as [number, number])
        );
      }

      // Se o usuário saiu da rota (> 220m), recalcula a malha viária real sem linha reta
      if (isOffRoute && now - lastRerouteTsRef.current >= 6000) {
        lastRerouteTsRef.current = now;
        const targetEnd =
          roadPathRef.current.length > 2
            ? roadPathRef.current[roadPathRef.current.length - 1]
            : { lat: destLat, lng: destLng };
        fetchRealRoadNetwork(rawLat, rawLng, targetEnd.lat, targetEnd.lng);
      }

      // 2. Atualiza instrução da próxima manobra com base no progresso na rota
      if (routeData?.steps && routeData.steps.length > 0 && roadPathRef.current.length > 2) {
        const stepIdx = Math.min(
          routeData.steps.length - 1,
          Math.floor(
            (closestIndex / Math.max(1, roadPathRef.current.length)) * routeData.steps.length
          )
        );
        const currentStep = routeData.steps[stepIdx];
        if (currentStep) {
          setActiveManeuver({
            instruction: currentStep.instruction,
            distanceText: currentStep.distanceText,
            maneuver: currentStep.maneuver,
          });
        }
      }

      // 3. Move o marcador sobre a linha da rua e desliza o mapa verticalmente
      const shouldPan = isInitial || movedMeters >= 4.0;
      syncPositionAndOrientation(
        snappedLat,
        snappedLng,
        forwardBearingDeg,
        shouldPan,
        isInitial
      );

      // 4. Atualiza km e minutos restantes até o ponto final real da rota
      const endPt =
        roadPathRef.current.length > 2
          ? roadPathRef.current[roadPathRef.current.length - 1]
          : { lat: destLat, lng: destLng };
      const liveDistKm = computeRoadDistanceKm(snappedLat, snappedLng, endPt.lat, endPt.lng);
      if (liveDistKm <= 250) {
        setRemainingDistanceKm(liveDistKm);
        const nextMin =
          liveDistKm <= 0.15 ? 0 : Math.max(1, Math.round(liveDistKm * avgMinutesPerKm));
        setRemainingMinutes(nextMin);
      }

      // 5. Reverse geocode do nome da rua atual no backend com throttle de 15s (sem sacudir a câmera)
      if (isInitial || now - lastSnappedApiTsRef.current >= 15000) {
        lastSnappedApiTsRef.current = now;
        const snapped = await snapAndReverseGeocodeGps(rawLat, rawLng);
        if (snapped?.streetName) {
          onLiveGpsUpdateRef.current?.(snappedLat, snappedLng, snapped.streetName);
          return;
        }
        onLiveGpsUpdateRef.current?.(snappedLat, snappedLng);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => handleGpsFix(pos, true),
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => handleGpsFix(pos, false),
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [
    destLat,
    destLng,
    baseDistanceKm,
    baseEtaMinutes,
    routeData,
    syncPositionAndOrientation,
    fetchRealRoadNetwork,
  ]);

  const handleRecenterGps = () => {
    hapticLight();
    userManualPanUntilRef.current = 0;
    setIsFollowingGps(true);
    hasActiveGpsFollowRef.current = true;
    const pos = liveUserPosRef.current;
    syncPositionAndOrientation(
      pos.lat,
      pos.lng,
      routeLookAheadBearingRef.current,
      true,
      false
    );
  };

  const handleToggleOrientationMode = () => {
    hapticLight();
    const nextCourseUp = !isCourseUp;
    setIsCourseUp(nextCourseUp);
    isCourseUpRef.current = nextCourseUp;
    userManualPanUntilRef.current = 0;
    setIsFollowingGps(true);
    hasActiveGpsFollowRef.current = true;

    const targetBearing = nextCourseUp ? routeLookAheadBearingRef.current : 0;
    mapBearingDegRef.current = targetBearing;
    setMapBearingDeg(targetBearing);

    const pos = liveUserPosRef.current;
    syncPositionAndOrientation(
      pos.lat,
      pos.lng,
      routeLookAheadBearingRef.current,
      true,
      false
    );
  };

  const formattedKm = useMemo(
    () => remainingDistanceKm.toFixed(1).replace('.', ','),
    [remainingDistanceKm]
  );

  const formattedHhMm = useMemo(
    () => formatCountdownHhMm(remainingMinutes),
    [remainingMinutes]
  );

  const wazeNavUrl = `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;

  const renderManeuverIcon = () => {
    const m = (activeManeuver.maneuver || '').toUpperCase();
    if (m.includes('RIGHT')) return <CornerUpRight className="w-5 h-5 text-white stroke-[2.5]" />;
    if (m.includes('LEFT')) return <CornerUpLeft className="w-5 h-5 text-white stroke-[2.5]" />;
    if (m.includes('U_TURN')) return <RotateCcw className="w-5 h-5 text-white stroke-[2.5]" />;
    return <ArrowUp className="w-5 h-5 text-white stroke-[2.5]" />;
  };

  return (
    <div
      ref={viewportRef}
      className={`relative flex-1 w-full h-full min-h-[340px] overflow-hidden flex flex-col select-none touch-none ${
        isDark ? 'bg-slate-950' : 'bg-slate-100'
      }`}
    >
      {/* 1. CARTÃO SUPERIOR DE NAVEGAÇÃO ESTILO UBER / WAZE */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <div
          className={`w-full p-2.5 rounded-[6px] border flex items-center justify-between gap-3 shadow-xl backdrop-blur-md transition ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-white'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-md'
          }`}
        >
          {/* Ícone de manobra com fundo verde sólido (Regra do Fundo Verde = Texto/Ícone Branco Puro) */}
          <div className="w-9 h-9 rounded-[4px] bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
            {isCalculatingRoad ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              renderManeuverIcon()
            )}
          </div>

          {/* Instrução da Manobra */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-emerald-400 font-mono">
                {activeManeuver.distanceText}
              </span>
              <span className="text-[10px] text-slate-400">• Rumo ao destino</span>
            </div>
            <h4 className="text-xs font-black truncate leading-tight">
              {activeManeuver.instruction}
            </h4>
          </div>

          {/* Atalhos rápidos para Waze ou Google Maps externo */}
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={wazeNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no aplicativo Waze"
              className="px-2 py-1 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition"
            >
              <span>Waze</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={googleMapsNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no aplicativo Google Maps"
              className="px-2 py-1 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition"
            >
              <span>Maps</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* BOTÃO DE GIRO DO MAPA / MODO VERTICAL COURSE-UP VS NORTE FIXO */}
      <button
        type="button"
        onClick={handleToggleOrientationMode}
        title={
          isCourseUp
            ? 'Navegação Vertical Ativa (Via sempre para cima) — Toque para Norte Fixo'
            : 'Norte Fixo — Toque para alinhar a via na vertical (Frente para Cima)'
        }
        className={`absolute top-18 right-2.5 z-20 px-2.5 py-1.5 rounded-[4px] border shadow-lg backdrop-blur-md flex items-center gap-1.5 text-[10px] font-extrabold transition cursor-pointer active:scale-95 ${
          isCourseUp
            ? 'bg-emerald-500 border-emerald-400 text-white'
            : isDark
              ? 'bg-slate-900/90 border-slate-800 text-slate-200'
              : 'bg-white/90 border-slate-200 text-slate-800'
        }`}
      >
        <Compass
          className={`w-3.5 h-3.5 transition-transform duration-300 ${
            isCourseUp ? 'text-white' : 'text-emerald-400'
          }`}
          style={{ transform: `rotate(${-mapBearingDeg.toFixed(0)}deg)` }}
        />
        <span className={isCourseUp ? 'text-white' : ''}>
          {isCourseUp ? 'Frente p/ Cima' : 'Norte Fixo'}
        </span>
      </button>

      {/* 2. ESTÁGIO ROTACIONÁVEL DO MAPA (164% OVERSIZED PARA COBRIR 100% DO FRAME EM QUALQUER ÂNGULO 0°-360°) */}
      <div
        className={`absolute inset-[-32%] w-[164%] h-[164%] z-0 ${
          isDark ? 'vagou-map-dark' : ''
        }`}
        style={
          {
            '--map-counter-rotate': `${mapBearingDeg.toFixed(1)}deg`,
            transform: `rotate(${-mapBearingDeg.toFixed(1)}deg)`,
            transition: isTouchInteracting
              ? 'none'
              : 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          } as React.CSSProperties
        }
      >
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* 3. BOTÃO FLUTUANTE RECENTRALIZAR NO GPS (APARECE SE O USUÁRIO ARRASTAR OU GIRAR O MAPA) */}
      {!isFollowingGps && (
        <button
          type="button"
          onClick={handleRecenterGps}
          className="absolute bottom-16 right-3 z-20 px-3 py-1.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xl active:scale-95 transition cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-white" />
          <span className="text-white">Recentralizar</span>
        </button>
      )}

      {/* 4. MEDIDOR DE VELOCIDADE REAL DO GPS (CANTO INFERIOR ESQUERDO) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div
          className={`px-2.5 py-1.5 rounded-[4px] border backdrop-blur-md flex flex-col items-center justify-center leading-none ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-white'
              : 'bg-white/90 border-slate-200 text-slate-900'
          }`}
        >
          <span className="text-sm font-black font-mono tabular-nums text-emerald-400">
            {currentSpeedKmh}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">km/h</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-1 rounded-[3px] bg-black/60 backdrop-blur-xs text-[9.5px] font-mono text-emerald-400 font-bold">
          <Compass className="w-3 h-3 text-emerald-400" />
          <span>GPS ATIVO</span>
        </div>
      </div>

      {/* 5. CANTO INFERIOR DIREITO DO MAPA: KM RESTANTE E HH:MM REGRESSIVO (HUD UBER) */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          if (remainingDistanceKm > 0.15) {
            const stepKm = Math.max(0.4, Number((baseDistanceKm / 4).toFixed(1)));
            const nextKm = Math.max(0, Number((remainingDistanceKm - stepKm).toFixed(1)));
            const ratio = baseDistanceKm > 0 ? nextKm / baseDistanceKm : 0;
            setRemainingDistanceKm(nextKm);
            setRemainingMinutes(
              nextKm <= 0.15 ? 0 : Math.max(1, Math.round(baseEtaMinutes * ratio))
            );

            const path = roadPathRef.current;
            if (path.length > 2) {
              const progress = Math.min(0.95, Math.max(0.05, 1 - ratio));
              const idx = Math.min(
                path.length - 1,
                Math.floor(progress * (path.length - 1))
              );
              const simPt = path[idx];
              userManualPanUntilRef.current = 0;
              hasActiveGpsFollowRef.current = true;
              setIsFollowingGps(true);
              liveUserPosRef.current = simPt;
              const { forwardBearingDeg, snappedLat, snappedLng, remainingPath } =
                findForwardRouteBearingAndRemainingPath(
                  simPt.lat,
                  simPt.lng,
                  path,
                  destLat,
                  destLng
                );
              routeLookAheadBearingRef.current = forwardBearingDeg;
              forwardHeadingRef.current = forwardBearingDeg;
              if (remainingPath.length > 2) {
                leafletOuterPolylineRef.current?.setLatLngs(
                  remainingPath.map((p) => [p.lat, p.lng] as [number, number])
                );
                leafletInnerPolylineRef.current?.setLatLngs(
                  remainingPath.map((p) => [p.lat, p.lng] as [number, number])
                );
              }
              syncPositionAndOrientation(
                snappedLat,
                snappedLng,
                forwardBearingDeg,
                true,
                false
              );
            }
          } else {
            setRemainingDistanceKm(baseDistanceKm);
            setRemainingMinutes(baseEtaMinutes);
            if (roadPathRef.current.length > 2) {
              const startPt = roadPathRef.current[0];
              userManualPanUntilRef.current = 0;
              hasActiveGpsFollowRef.current = true;
              setIsFollowingGps(true);
              liveUserPosRef.current = startPt;
              const { forwardBearingDeg } = findForwardRouteBearingAndRemainingPath(
                startPt.lat,
                startPt.lng,
                roadPathRef.current,
                destLat,
                destLng
              );
              routeLookAheadBearingRef.current = forwardBearingDeg;
              forwardHeadingRef.current = forwardBearingDeg;
              const latlngs = roadPathRef.current.map(
                (p) => [p.lat, p.lng] as [number, number]
              );
              leafletOuterPolylineRef.current?.setLatLngs(latlngs);
              leafletInnerPolylineRef.current?.setLatLngs(latlngs);
              syncPositionAndOrientation(
                startPt.lat,
                startPt.lng,
                forwardBearingDeg,
                true,
                false
              );
            }
          }
        }}
        title="Distância e tempo restantes até o destino (toque para simular aproximação)"
        className={`absolute bottom-3 right-3 z-10 px-3.5 py-2 rounded-[4px] backdrop-blur-md flex items-baseline gap-3 select-none cursor-pointer transition shadow-xl ${
          isDark
            ? 'bg-slate-900/95 text-white border border-slate-800'
            : 'bg-white/95 text-slate-900 border border-slate-200'
        }`}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black font-mono tabular-nums tracking-tight">
            {formattedKm}
          </span>
          <span className="text-[11px] font-extrabold uppercase text-slate-400">km</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black font-mono tabular-nums tracking-tight text-emerald-400">
            {formattedHhMm}
          </span>
        </div>
      </button>
    </div>
  );
};
