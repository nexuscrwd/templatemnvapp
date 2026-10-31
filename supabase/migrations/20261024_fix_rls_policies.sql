-- ==============================================================================
-- 💈 VAGOU APP — CORREÇÃO DEFINITIVA DE RLS (POLICIES) NO SUPABASE
-- Data: 24/10/2026
-- Objetivo: Liberar permissão para gravação de agendamentos e clientes
--           tanto para usuários anônimos (anon) quanto autenticados (authenticated)
-- ==============================================================================

-- 1. TABELA APPOINTMENTS (Agendamentos)
-- Permite leitura, criação e atualização por clientes e salões
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.appointments TO anon, authenticated, service_role;

-- 2. TABELA CLIENTS (Clientes)
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.clients TO anon, authenticated, service_role;

-- 3. TABELA CLIENT_FAMILY_MEMBERS (Conta Família / Dependentes)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_family_members') THEN
    ALTER TABLE public.client_family_members DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON TABLE public.client_family_members TO anon, authenticated, service_role;
  END IF;
END $$;

-- 4. DEMAIS TABELAS OPERACIONAIS DO VAGOU
ALTER TABLE IF EXISTS public.salons DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.salons TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.professionals DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.professionals TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.services TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.service_offers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.service_offers TO anon, authenticated, service_role;

-- 5. PERMISSÃO EM SEQUÊNCIAS (Para IDs auto-incrementais se houver)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- NOTA: Caso a equipe de segurança prefira MANTER o RLS ATIVO com POLICIES explícitas,
-- use o bloco abaixo em vez de DISABLE ROW LEVEL SECURITY:
--
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "allow_public_appointments_all" ON public.appointments;
-- CREATE POLICY "allow_public_appointments_all" ON public.appointments
--   FOR ALL TO anon, authenticated, service_role
--   USING (true) WITH CHECK (true);
--
-- ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "allow_public_clients_all" ON public.clients;
-- CREATE POLICY "allow_public_clients_all" ON public.clients
--   FOR ALL TO anon, authenticated, service_role
--   USING (true) WITH CHECK (true);
-- ==============================================================================
