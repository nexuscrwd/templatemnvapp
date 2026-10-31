# 🛠️ Manual de Engenharia & Design UI/UX — Vagou

> **Versão:** 1.2.0  
> **Público-Alvo:** Engenheiros Frontend/Full-Stack e Designers de UI/UX  
> **Objetivo:** Documentar a arquitetura visual, tokens de design, taxonomia de componentes, hierarquia de camadas e fluxos de estado do ecossistema **Vagou**.

---

## 🎨 1. Design System & Tokens Visuais

O aplicativo segue estritamente a Identidade Visual Oficial:

| Elemento | Token / Valor | Utilização |
| :--- | :--- | :--- |
| **Verde Vagou (Primário)** | `#20C933` (`emerald-500` / destaque) | Botões de ação principal (CTA), indicadores de status ativo, badge VIP e selos relâmpago. |
| **Grafite Vagou (Base)** | `#151A1E` (`bg-[#151A1E]`) | Cor base dos cabeçalhos, rodapé (`BottomNav`), menus modais e gaveta de perfil. |
| **Preto Profundo** | `slate-950` (`#020617`) | Fundo geral da aplicação para contraste e economia de bateria (OLED). |
| **Superfícies de Cards** | `slate-900` (`#0f172a`) com borda `slate-800` | Cards de vagas do radar, container de carrossel e painéis. |
| **Tipografia Principal** | **Poppins** (400, 500, 600, 700, 900) | Títulos, logotipo, chips de categoria e botões de ação. |
| **Tipografia Secundária** | Sans-serif do sistema | Textos longos e regras de cancelamento. |

---

## 📐 2. Hierarquia de Camadas (`z-index`)

A sobreposição visual foi matematicamente estruturada para garantir rolagem fluida e impedir vazamento de elementos:

```
z-50: Modais do Sistema & Onboarding (InterestOnboardingModal, ProfileDrawer, InstallModal)
  └── z-40: TopBar Unificada Fixa (VagouLogo, Perfil do Usuário e Chips de Categoria)
        └── z-30: BottomNav Fixo no Rodapé (Radar, Buscar, Mapa, Agenda)
              └── z-20: Visualizador Fullscreen de Stories (RadarStoryModal)
                    └── z-10: Ações internas do card (Botão de Áudio, Carrossel de Fotos)
                          └── z-0: Feed rolável e cards de vagas (RadarOfferCard)
```

---

## 🧩 3. Arquitetura de Componentes

### 3.1. `HomeScreen.tsx` (Feed Radar com Categorias Estilo Netflix)
- **Top Header**:
  - Lado Esquerdo: `VagouLogo` oficial vetorizado com isotipo de geolocalização.
  - Centro/Direita: Seletor rápido de Perfil (`Barbearia (Anderson)` / `Salão (Esposa)`).
  - Extremo Direito: Foto do avatar do usuário com anel verde `#20C933` que dispara a `ProfileDrawer`.
- **Barra de Categorias Estilo Netflix**:
  - Chips em linha única com scroll horizontal livre de scrollbar (`no-scrollbar`).
  - **Regra de Anti-Poluição**: Sem emojis arbitrários de tesoura ou martelo. Apenas o raio `⚡` é mantido na categoria "Relâmpago".
- **Feed Strip**:
  - Indicador de vagas abertas em tempo real + Ordenação (Urgência, Distância, Preço).
- **Stories do Radar**:
  - Nível 3 (Vídeo vertical), Nível 2 (Fotos) e Nível 1 (Fallback temático).

### 3.2. `SearchScreen.tsx` (Aba de Busca Dedicada)
- Integrada na aba **Buscar** do `BottomNav`.
- Campo de busca instantânea (por nome de salão, profissional, corte, barba ou bairro).
- Filtro por bairro dinâmico (`Itaquera`, `Tatuapé`, `Mooca`, etc.).
- Ordenação por urgência, distância e valor.

### 3.3. `ProfileDrawer.tsx` (Gaveta Lateral de Perfil do Usuário)
- Disparada pelo clique na foto de perfil no cabeçalho superior.
- Apresenta dados do usuário logado (ex: Anderson Silva, Cliente VIP).
- Seletor rápido de perfil de recomendações (Barbearia x Salão x Geral).
- Atalhos para Meus Agendamentos, Personalização de Interesses e **Painel do Parceiro (Sou Salão)**.

### 3.4. `InterestOnboardingModal.tsx` (Onboarding de Preferências)
- Modal rápido de 1-toque para onboarding inicial ou reconfiguração.
- Categorias agrupadas:
  1. *Barbearia & Beleza Masculina* (Barba, Corte, Degradê)
  2. *Salão Feminino & Mechas* (Corte, Escova, Hidratação)
  3. *Unhas, Cílios & Sobrancelhas* (Manicure em Gel, Alongamento)
  4. *Estética & Cuidados Faciais* (Limpeza de Pele, Massagem)

### 3.5. `BottomNav.tsx` (Barra de Navegação Inferior)
- Fundo em Grafite Vagou `#151A1E` com borda sutil `slate-800`.
- 4 Abas principais:
  - 📻 **Radar** (`home`): Vagas abertas agora com contagem regressiva.
  - 🔍 **Buscar** (`busca`): Pesquisa de serviços, profissionais e salões.
  - 📍 **Mapa** (`mapa`): Visão GIS geográfica em tempo real.
  - 📅 **Agenda** (`agenda`): Agendamentos ativos e código do protocolo.

---

## 🔄 4. Fluxo de Agendamento Imediato (Booking Flow)

1. **Descoberta**: Usuário visualiza a vaga no feed com selo de contagem regressiva (`expiresInMinutes`).
2. **Ação Imediata**: Botão `AGENDAR` (CTA verde `#20C933` com texto em `slate-950`).
3. **Tela de Detalhes** (`OfferDetailScreen`): Horário do Agendamento, profissional e garantia "Agendamento Protegido".
4. **Confirmação** (`ConfirmationScreen`): Gera protocolo único (ex: `#VGA-48291`), espelha na Agenda do Parceiro e dispara notificação PWA de lembrete.
