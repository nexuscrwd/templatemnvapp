-- =============================================================================
-- 🏛️ TRÍADE VAGOUAPP — SCRIPT SQL OFICIAL: PERGUNTAS SECRETAS E RECUPERAÇÃO
-- =============================================================================
-- Objetivo:
-- 1. Criar o catálogo oficial de perguntas secretas (public.security_questions)
-- 2. Inserir as 3 perguntas secretas oficiais:
--    - "Qual o nome do meu animal de estimação?"
--    - "Onde vc morou aos 10 anos?"
--    - "Nome do seu amigo de infância?"
-- 3. Criar a tabela de respostas dos usuários (public.user_security_answers)
--    e colunas auxiliares em public.clients
-- 4. Disponibilizar funções/queries de sorteio aleatório e consulta de respostas
-- =============================================================================

-- 1. TABELA DE CATÁLOGO DE PERGUNTAS SECRETAS
CREATE TABLE IF NOT EXISTS public.security_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  category_label TEXT NOT NULL,
  question_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INSERÇÃO DAS PERGUNTAS SECRETAS OFICIAIS
INSERT INTO public.security_questions (code, category_label, question_text, is_active)
VALUES
  ('first_pet', 'Animal de estimação', 'Qual o nome do meu animal de estimação?', TRUE),
  ('city_at_10', 'Moradia aos 10 anos', 'Onde vc morou aos 10 anos?', TRUE),
  ('childhood_friend', 'Amigo de infância', 'Nome do seu amigo de infância?', TRUE)
ON CONFLICT (code) DO UPDATE
SET
  category_label = EXCLUDED.category_label,
  question_text = EXCLUDED.question_text,
  is_active = EXCLUDED.is_active;

-- 3. COLUNAS AUXILIARES EM public.clients (PARA CONSULTA RÁPIDA)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS security_question_code TEXT,
  ADD COLUMN IF NOT EXISTS security_answer_normalized TEXT;

-- 4. TABELA DE RESPOSTAS DAS PERGUNTAS SECRETAS DOS USUÁRIOS
CREATE TABLE IF NOT EXISTS public.user_security_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID,
  question_code TEXT NOT NULL REFERENCES public.security_questions(code) ON UPDATE CASCADE,
  question_text TEXT NOT NULL,
  answer_normalized TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, question_code)
);

CREATE INDEX IF NOT EXISTS idx_user_security_answers_lookup
  ON public.user_security_answers (question_code, answer_normalized);

-- 5. HABILITAÇÃO DE RLS E POLÍTICAS DE ACESSO
ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de perguntas secretas" ON public.security_questions;
CREATE POLICY "Leitura publica de perguntas secretas"
  ON public.security_questions
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Acesso publico controlado a respostas secretas" ON public.user_security_answers;
CREATE POLICY "Acesso publico controlado a respostas secretas"
  ON public.user_security_answers
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- 6. FUNÇÃO RPC PARA SORTEAR UMA PERGUNTA SECRETA ALEATÓRIA
CREATE OR REPLACE FUNCTION public.get_random_security_question()
RETURNS TABLE (
  id UUID,
  code TEXT,
  category_label TEXT,
  question_text TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    sq.id,
    sq.code,
    sq.category_label,
    sq.question_text
  FROM public.security_questions sq
  WHERE sq.is_active = TRUE
  ORDER BY random()
  LIMIT 1;
$$;

-- 7. FUNÇÃO RPC PARA CONSULTAR A RESPOSTA E RECUPERAR O NOME DE USUÁRIO (@username)
CREATE OR REPLACE FUNCTION public.recover_username_by_security_answer(
  p_question_code TEXT,
  p_answer TEXT,
  p_contact_hint TEXT DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  username TEXT,
  full_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_answer TEXT;
BEGIN
  v_normalized_answer := lower(trim(regexp_replace(p_answer, '\s+', ' ', 'g')));

  RETURN QUERY
  SELECT
    c.id AS client_id,
    c.username,
    c.name AS full_name,
    c.email
  FROM public.clients c
  LEFT JOIN public.user_security_answers usa
    ON usa.client_id = c.id
  WHERE
    c.username IS NOT NULL
    AND (
      (usa.question_code = p_question_code AND lower(trim(usa.answer_normalized)) = v_normalized_answer)
      OR
      (c.security_question_code = p_question_code AND lower(trim(c.security_answer_normalized)) = v_normalized_answer)
    )
    AND (
      p_contact_hint IS NULL
      OR trim(p_contact_hint) = ''
      OR lower(c.email) = lower(trim(p_contact_hint))
      OR regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') LIKE '%' || regexp_replace(p_contact_hint, '\D', '', 'g')
    )
  LIMIT 1;
END;
$$;

-- =============================================================================
-- 🔍 EXEMPLOS DE CONSULTAS SQL DIRETAS (SELECT / INSERT)
-- =============================================================================

-- A) Sortear 1 pergunta secreta aleatória:
-- SELECT code, category_label, question_text
-- FROM public.security_questions
-- WHERE is_active = TRUE
-- ORDER BY random()
-- LIMIT 1;

-- B) Inserir/Atualizar a resposta secreta de um usuário:
-- INSERT INTO public.user_security_answers (client_id, question_code, question_text, answer_normalized)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'first_pet',
--   'Nome do primeiro animal de estimação?',
--   lower(trim('Rex'))
-- )
-- ON CONFLICT (client_id, question_code)
-- DO UPDATE SET
--   answer_normalized = EXCLUDED.answer_normalized,
--   updated_at = NOW();

-- C) Consultar o @username do cliente pela resposta da pergunta secreta:
-- SELECT c.id, c.name, c.username, c.email, usa.question_text
-- FROM public.user_security_answers usa
-- JOIN public.clients c ON c.id = usa.client_id
-- WHERE usa.question_code = 'first_pet'
--   AND lower(trim(usa.answer_normalized)) = lower(trim('Rex'));
