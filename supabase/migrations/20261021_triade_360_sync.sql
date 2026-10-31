-- ============================================================================
-- MIGRAÇÃO OFICIAL: SINCRONIZAÇÃO TOTAL 360º TRÍADE VAGOUAPP (admvapp ⇄ mnvapp ⇄ pvapp)
-- Data: 2026-10-21
-- ============================================================================

-- 1. Colunas adicionais em public.salons (Tema Camaleão & Fotos do Espaço)
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS theme_preset_id text DEFAULT 'emerald-dark';
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS facade_photo_url text;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS interior_photo_url text;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS cover_image_url text;

-- 2. Colunas adicionais em public.services (Catálogo Unificado)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 50;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS slides jsonb DEFAULT '[]'::jsonb;

-- 3. Tabela public.salon_services (Espelho Relacional Direto do Catálogo para o Admin)
CREATE TABLE IF NOT EXISTS public.salon_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  category text DEFAULT 'Geral',
  price numeric DEFAULT 0,
  duration_minutes integer DEFAULT 30,
  commission_rate numeric DEFAULT 50,
  description text,
  image_url text,
  photos jsonb DEFAULT '[]'::jsonb,
  videos jsonb DEFAULT '[]'::jsonb,
  slides jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Tabela public.salon_media_items (Galeria de Fotos, Vídeos 5s & Imagens)
CREATE TABLE IF NOT EXISTS public.salon_media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  title text DEFAULT 'Mídia do Salão',
  url text NOT NULL,
  type text DEFAULT 'image',
  media_group text DEFAULT 'fotos',
  category text DEFAULT 'servicos',
  duration_seconds numeric DEFAULT 5,
  is_cover boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Colunas adicionais em public.professionals (Equipe & Comissões)
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'professional';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS phone_whatsapp text;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 50;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS product_commission_rate numeric DEFAULT 10;

-- 6. Tabela public.dependents & Contador em public.clients (Conta Família & Dependentes)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dependents_count integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text DEFAULT 'other',
  birth_date text,
  notes text,
  is_unlinked boolean DEFAULT false,
  unlinked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Tabela public.salon_utilities_records (Consumo Energia/Água, Equipamentos, DRE e Insumos)
CREATE TABLE IF NOT EXISTS public.salon_utilities_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid UNIQUE REFERENCES public.salons(id) ON DELETE CASCADE,
  energy_meters jsonb DEFAULT '[]'::jsonb,
  energy_readings jsonb DEFAULT '[]'::jsonb,
  water_meters jsonb DEFAULT '[]'::jsonb,
  water_readings jsonb DEFAULT '[]'::jsonb,
  appliances jsonb DEFAULT '[]'::jsonb,
  dre_records jsonb DEFAULT '[]'::jsonb,
  supply_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Políticas RLS Abertas para Sincronização da Tríade
ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all access salon_services" ON public.salon_services;
CREATE POLICY "Public all access salon_services" ON public.salon_services FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.salon_media_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all access salon_media_items" ON public.salon_media_items;
CREATE POLICY "Public all access salon_media_items" ON public.salon_media_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all access dependents" ON public.dependents;
CREATE POLICY "Public all access dependents" ON public.dependents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.salon_utilities_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all access salon_utilities_records" ON public.salon_utilities_records;
CREATE POLICY "Public all access salon_utilities_records" ON public.salon_utilities_records FOR ALL USING (true) WITH CHECK (true);
