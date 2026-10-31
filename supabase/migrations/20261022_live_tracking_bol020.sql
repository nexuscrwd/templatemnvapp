-- =================================================================================
-- MIGRAÇÃO OFICIAL TRÍADE VAGOUAPP — BOLETIM TÉCNICO BOL-020
-- Radar Bidirecional de Deslocamento Ao Vivo ("Estou a Caminho"),
-- Traçador de Rota Nativo (Google Maps API) & Rastreamento 10s (Mapa ⇄ Linha Shopee)
-- =================================================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_location_type text DEFAULT 'in_salon',
  -- Valores: 'in_salon' (Cliente vai ao Salão) | 'home_delivery' (Profissional vai ao Cliente)

  ADD COLUMN IF NOT EXISTS transport_mode text DEFAULT 'driving',
  -- Valores: 'walking' | 'transit' | 'rideshare' | 'driving' | 'motorcycle'

  ADD COLUMN IF NOT EXISTS tracking_status text DEFAULT 'idle',
  -- Valores: 'idle' | 'alerted' | 'hurry_confirmed' | 'on_way_no_map' | 'live_sharing'
  --          | 'arriving_5min' | 'arrived' | 'rescheduled' | 'cancelled'

  ADD COLUMN IF NOT EXISTS selected_route_summary text,
  -- Ex: 'Rota 1 • Via Av. Rebouças e Rua Oscar Freire'

  ADD COLUMN IF NOT EXISTS route_polyline text,
  -- Polilinha codificada da Google Maps Routes API para desenhar a linha no mapa

  ADD COLUMN IF NOT EXISTS current_street_name text,
  -- Rua atual onde o cliente/profissional está (atualizada a cada 10s)

  ADD COLUMN IF NOT EXISTS route_checkpoints jsonb DEFAULT '[]'::jsonb,
  -- Vetor de ruas da rota (Estilo Shopee/Correios):
  -- [{ "street": "Av. Paulista", "distanceText": "1.2 km", "status": "passed", "timestamp": "14:15" },
  --  { "street": "Av. Rebouças", "distanceText": "850 m", "status": "current", "timestamp": "14:21", "adversity": { "type": "traffic", "label": "Trânsito intenso", "addedMinutes": 6 } },
  --  { "street": "Rua Oscar Freire", "distanceText": "400 m", "status": "upcoming" }]

  ADD COLUMN IF NOT EXISTS active_adversity jsonb DEFAULT null,
  -- Retenção ativa: { "type": "traffic", "label": "Trânsito inesperado na via", "street": "Av. Rebouças", "addedMinutes": 6, "reportedAt": "14:21" }

  ADD COLUMN IF NOT EXISTS delay_minutes integer DEFAULT 0,
  -- Minutos totais de atraso somados ao ETA original

  ADD COLUMN IF NOT EXISTS client_lat double precision,
  ADD COLUMN IF NOT EXISTS client_lng double precision,
  ADD COLUMN IF NOT EXISTS distance_km numeric(6,2),
  ADD COLUMN IF NOT EXISTS eta_minutes integer,
  ADD COLUMN IF NOT EXISTS prep_buffer_minutes integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS last_location_update timestamptz;

CREATE INDEX IF NOT EXISTS idx_appointments_live_tracking
  ON public.appointments (salon_id, date_str, tracking_status);
