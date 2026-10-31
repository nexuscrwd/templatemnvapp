-- ============================================================================
-- MIGRAÇÃO SUPABASE: ENDEREÇO COMPLETO, CPF & COORDENADAS GPS (TRÍADE VAGOUAPP)
-- Boletins Integrados: bol-023 (mnvapp) & bol-024 (admvapp)
-- ============================================================================
-- 100% Idempotente (Seguro para rodar múltiplas vezes no SQL Editor do Supabase)
-- ============================================================================

BEGIN;

-- 1. Estabelecimentos (salons)
ALTER TABLE IF EXISTS public.salons
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS owner_cpf text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

-- 2. Clientes Globais (clients)
ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

-- 3. Profissionais / Especialistas (professionals)
ALTER TABLE IF EXISTS public.professionals
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

-- 4. Perfis de Acesso (profiles)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

-- 5. Usuários de Salão / Gestores (salon_users)
ALTER TABLE IF EXISTS public.salon_users
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

-- 6. Índices para Sincronização por CPF e Cálculo de Distância/Rota
CREATE INDEX IF NOT EXISTS idx_salons_owner_cpf ON public.salons(owner_cpf);
CREATE INDEX IF NOT EXISTS idx_salons_coords ON public.salons(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON public.clients(cpf);
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON public.professionals(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'salon_users'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_salon_users_cpf ON public.salon_users(cpf);';
  END IF;
END $$;

-- 7. Colunas de Telemetria e Rota Viária em public.appointments
ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS transport_mode TEXT DEFAULT 'driving',
  ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS prep_buffer_minutes INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS selected_route_summary TEXT,
  ADD COLUMN IF NOT EXISTS route_polyline JSONB,
  ADD COLUMN IF NOT EXISTS current_street_name TEXT,
  ADD COLUMN IF NOT EXISTS route_checkpoints JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS client_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS origin_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS origin_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS salon_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS salon_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS origin_formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_tracking_status
  ON public.appointments (salon_id, date_str, tracking_status);

-- 8. Trigger de Sincronização Automática de Endereço/Coordenadas por CPF na Tríade
CREATE OR REPLACE FUNCTION public.fn_sync_triade_geo_by_cpf()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_cpf TEXT;
BEGIN
  clean_cpf := regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g');
  IF length(clean_cpf) = 11 AND (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    IF TG_TABLE_NAME <> 'clients' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clients') THEN
      UPDATE public.clients
      SET latitude = NEW.latitude,
          longitude = NEW.longitude,
          address = COALESCE(NEW.address, address),
          street_number = COALESCE(NEW.street_number, street_number),
          complement = COALESCE(NEW.complement, complement),
          neighborhood = COALESCE(NEW.neighborhood, neighborhood),
          city = COALESCE(NEW.city, city),
          state = COALESCE(NEW.state, state),
          cep = COALESCE(NEW.cep, cep),
          formatted_address = COALESCE(NEW.formatted_address, formatted_address),
          google_place_id = COALESCE(NEW.google_place_id, google_place_id)
      WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = clean_cpf
        AND (latitude IS DISTINCT FROM NEW.latitude OR longitude IS DISTINCT FROM NEW.longitude);
    END IF;

    IF TG_TABLE_NAME <> 'profiles' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
      UPDATE public.profiles
      SET latitude = NEW.latitude,
          longitude = NEW.longitude,
          address = COALESCE(NEW.address, address),
          street_number = COALESCE(NEW.street_number, street_number),
          complement = COALESCE(NEW.complement, complement),
          neighborhood = COALESCE(NEW.neighborhood, neighborhood),
          city = COALESCE(NEW.city, city),
          state = COALESCE(NEW.state, state),
          cep = COALESCE(NEW.cep, cep),
          formatted_address = COALESCE(NEW.formatted_address, formatted_address),
          google_place_id = COALESCE(NEW.google_place_id, google_place_id)
      WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = clean_cpf
        AND (latitude IS DISTINCT FROM NEW.latitude OR longitude IS DISTINCT FROM NEW.longitude);
    END IF;

    IF TG_TABLE_NAME <> 'professionals' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='professionals') THEN
      UPDATE public.professionals
      SET latitude = NEW.latitude,
          longitude = NEW.longitude,
          address = COALESCE(NEW.address, address),
          street_number = COALESCE(NEW.street_number, street_number),
          complement = COALESCE(NEW.complement, complement),
          neighborhood = COALESCE(NEW.neighborhood, neighborhood),
          city = COALESCE(NEW.city, city),
          state = COALESCE(NEW.state, state),
          cep = COALESCE(NEW.cep, cep),
          formatted_address = COALESCE(NEW.formatted_address, formatted_address),
          google_place_id = COALESCE(NEW.google_place_id, google_place_id)
      WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = clean_cpf
        AND (latitude IS DISTINCT FROM NEW.latitude OR longitude IS DISTINCT FROM NEW.longitude);
    END IF;

    IF TG_TABLE_NAME <> 'salon_users' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='salon_users') THEN
      UPDATE public.salon_users
      SET latitude = NEW.latitude,
          longitude = NEW.longitude,
          address = COALESCE(NEW.address, address),
          street_number = COALESCE(NEW.street_number, street_number),
          complement = COALESCE(NEW.complement, complement),
          neighborhood = COALESCE(NEW.neighborhood, neighborhood),
          city = COALESCE(NEW.city, city),
          state = COALESCE(NEW.state, state),
          cep = COALESCE(NEW.cep, cep),
          formatted_address = COALESCE(NEW.formatted_address, formatted_address),
          google_place_id = COALESCE(NEW.google_place_id, google_place_id)
      WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = clean_cpf
        AND (latitude IS DISTINCT FROM NEW.latitude OR longitude IS DISTINCT FROM NEW.longitude);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- 9. Recarrega imediatamente o cache de schema do PostgREST (evita erro PGRST204)
NOTIFY pgrst, 'reload schema';
