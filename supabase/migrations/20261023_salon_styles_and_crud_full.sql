-- ==============================================================================
-- 💈 VAGOU APP — MIGRAÇÃO OFICIAL: BLINDAGEM DE ESTILOS, CORES, UI E CRUD TOTAL
-- Data: 2026-10-23
-- Compatibilidade: admvapp ⇄ mnvapp ⇄ pvapp (Tríade Sync)
-- ==============================================================================

-- 1. COLUNAS DE CORES, ESTILOS DE CABEÇALHO, BARRA DE SEÇÕES E RODAPÉ EM public.salons
ALTER TABLE public.salons
  -- Tema, Título e Identidade Visual
  ADD COLUMN IF NOT EXISTS default_theme text DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS pwa_name text,
  ADD COLUMN IF NOT EXISTS show_slogan boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_text_fallback text,
  ADD COLUMN IF NOT EXISTS logo_text_color text,
  ADD COLUMN IF NOT EXISTS show_hero_slides boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS welcome_style text DEFAULT 'atmospheric',

  -- Barra de Título das Seções (Section Header)
  ADD COLUMN IF NOT EXISTS section_header_bg_color text,
  ADD COLUMN IF NOT EXISTS section_header_text_color text,
  ADD COLUMN IF NOT EXISTS section_header_icon_color text,
  ADD COLUMN IF NOT EXISTS section_header_bg_style text DEFAULT 'glass',
  ADD COLUMN IF NOT EXISTS section_header_border text DEFAULT 'bordered',
  ADD COLUMN IF NOT EXISTS section_header_btn_bg_color text,
  ADD COLUMN IF NOT EXISTS section_header_btn_active_bg_color text,
  ADD COLUMN IF NOT EXISTS section_header_btn_border text,
  ADD COLUMN IF NOT EXISTS section_header_btn_shadow text,
  ADD COLUMN IF NOT EXISTS section_header_btn_blur text,
  ADD COLUMN IF NOT EXISTS section_header_btn_font text,

  -- Barra de Navegação Inferior (BottomNav)
  ADD COLUMN IF NOT EXISTS nav_style text DEFAULT 'minimal',
  ADD COLUMN IF NOT EXISTS nav_shape text DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS nav_border text DEFAULT 'bordered',
  ADD COLUMN IF NOT EXISTS nav_bg_style text DEFAULT 'glass',
  ADD COLUMN IF NOT EXISTS nav_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_btn_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_btn_active_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_active_color text,
  ADD COLUMN IF NOT EXISTS nav_text_color text,
  ADD COLUMN IF NOT EXISTS nav_btn_shadow text,
  ADD COLUMN IF NOT EXISTS nav_btn_blur text,
  ADD COLUMN IF NOT EXISTS nav_btn_font text,

  -- Campos Operacionais, Fiscais, Redes e Espaço
  ADD COLUMN IF NOT EXISTS owner_cpf text,
  ADD COLUMN IF NOT EXISTS pix_keys jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'barbearia',
  ADD COLUMN IF NOT EXISTS opening_hours_text text,
  ADD COLUMN IF NOT EXISTS space_photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS space_description text,
  ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS holidays jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cancellation_policy jsonb,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS maps_url text;

-- 2. TABELA DEDICADA DE CONFIGURAÇÕES DE UI & CORES DO ESTABELECIMENTO (ESPELHO ESTRUTURADO)
CREATE TABLE IF NOT EXISTS public.salon_ui_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL UNIQUE REFERENCES public.salons(id) ON DELETE CASCADE,
  
  -- Identidade Geral
  default_theme text DEFAULT 'dark',
  primary_color text DEFAULT '#20C933',
  secondary_color text DEFAULT '#0F172A',
  brand_font text DEFAULT 'Poppins',
  pwa_name text,
  slogan text,
  show_slogan boolean DEFAULT true,
  logo_text_fallback text,
  logo_text_color text,
  show_hero_slides boolean DEFAULT true,
  welcome_style text DEFAULT 'atmospheric',

  -- Barra de Título das Seções
  section_header_bg_color text,
  section_header_text_color text,
  section_header_icon_color text,
  section_header_bg_style text DEFAULT 'glass',
  section_header_border text DEFAULT 'bordered',
  section_header_btn_bg_color text,
  section_header_btn_active_bg_color text,
  section_header_btn_border text,
  section_header_btn_shadow text,
  section_header_btn_blur text,
  section_header_btn_font text,

  -- Barra de Navegação Inferior
  nav_style text DEFAULT 'minimal',
  nav_shape text DEFAULT 'square',
  nav_border text DEFAULT 'bordered',
  nav_bg_style text DEFAULT 'glass',
  nav_bg_color text,
  nav_btn_bg_color text,
  nav_btn_active_bg_color text,
  nav_active_color text,
  nav_text_color text,
  nav_btn_shadow text,
  nav_btn_blur text,
  nav_btn_font text,

  -- Backup JSON completo
  branding_snapshot jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salon_ui_settings_salon_id ON public.salon_ui_settings(salon_id);

-- 3. POLÍTICAS RLS PARA ACESSO TRANSPARENTE E SEGURO
ALTER TABLE public.salon_ui_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all access salon_ui_settings" ON public.salon_ui_settings;
CREATE POLICY "Public all access salon_ui_settings" ON public.salon_ui_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. BUCKET DE ARMAZENAMENTO PARA IMAGENS (SUPABASE STORAGE)
-- Garante buckets públicos para mídias do salão e avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-media', 'salon-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage públicas para upload e leitura
DROP POLICY IF EXISTS "Public Access Salon Media" ON storage.objects;
CREATE POLICY "Public Access Salon Media" ON storage.objects FOR ALL
  USING (bucket_id IN ('salon-media', 'avatars'))
  WITH CHECK (bucket_id IN ('salon-media', 'avatars'));
