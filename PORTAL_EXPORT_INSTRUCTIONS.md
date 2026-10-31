# 📦 Instruções de Integração do Cadastro no Portal do Parceiro

Este documento orienta como levar o código do **Cadastro de Estabelecimentos** para o repositório do **Portal Web do Parceiro** (`meunegocio.vagouapp.com` / `portal`).

---

## 📁 Arquivos Exportados

1. **`src/portal-export/PartnerRegistrationWizard.tsx`**:
   - Componente React completo com o fluxo de cadastro em 3 passos:
     1. **Estabelecimento:** Nome fantasia, WhatsApp comercial, busca automática de CEP (ViaCEP) com preenchimento de logradouro, complemento, bairro, cidade e UF.
     2. **Responsável Legal:** Nome completo, CPF formatado, e-mail de acesso e senha estrita (8 a 10 dígitos, letra maiúscula e caractere especial).
     3. **Segmento & Identidade Visual:** Barbearia, Salão, Esmalteria, Estética ou Outros, paleta de cores hexadecimais e slug exclusivo do app (`vagou.app/seu-salao`).
   - Integração com Supabase Auth (`signUpWithSupabase`) e gravação na tabela `salons` (`syncSalonDataToSupabase`).
   - Disparo do modal de boas-vindas pós-cadastro (`PartnerOnboardingModal`).

2. **`src/components/PartnerOnboardingModal.tsx`**:
   - Modal em 5 etapas para setup pós-cadastro (modelo de operação: salão físico, atendimento a domicílio ou híbrido, logomarcas, equipe inicial e primeiro catálogo de serviços).

---

## 🚀 Como Utilizar no Portal Web

1. Copie o arquivo `src/portal-export/PartnerRegistrationWizard.tsx` para o repositório do Portal Web (ex: `src/pages/RegisterPage.tsx` ou `src/components/registration/PartnerRegistrationWizard.tsx`).
2. Copie o arquivo `src/components/PartnerOnboardingModal.tsx` caso queira disponibilizar o assistente de boas-vindas no portal.
3. Certifique-se de que as dependências (`lucide-react`, `@supabase/supabase-js`, `tailwindcss`) estejam presentes no `package.json` do Portal.
