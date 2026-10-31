-- ==============================================================================
-- 💈 VAGOU APP — CORREÇÃO DEFINITIVA DE RLS PARA PERSISTÊNCIA TOTAL
-- ==============================================================================

-- 1. PERMITIR ACESSO TOTAL PARA LEITURA E ESCRITA NAS TABELAS PRINCIPAIS
-- (Evita bloqueios 42501 em criações de serviços, alterações de perfil e gestão)

-- SALONS
ALTER TABLE public.salons DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.salons TO anon, authenticated, service_role;

-- SERVICES
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.services TO anon, authenticated, service_role;

-- PROFESSIONALS
ALTER TABLE public.professionals DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.professionals TO anon, authenticated, service_role;

-- CLIENTS
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.clients TO anon, authenticated, service_role;

-- APPOINTMENTS
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.appointments TO anon, authenticated, service_role;

-- SERVICE OFFERS (Vagas Relâmpago)
ALTER TABLE public.service_offers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.service_offers TO anon, authenticated, service_role;

-- CLIENT FAMILY MEMBERS (Dependentes / Conta Família)
IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_family_members') THEN
    ALTER TABLE public.client_family_members DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.client_family_members TO anon, authenticated, service_role;
END IF;
