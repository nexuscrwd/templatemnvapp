# 🗺️ Arquitetura e Visão Técnica — Vagou

O **Vagou** é um ecossistema mobile-first em tempo real para liquidação de vagas imediatas e horários ociosos em salões de beleza, barbearias, estética e bem-estar.

---

## 🏛️ A Tríade VagouApp (Governança e Escopo dos Projetos)

O ecossistema é formalmente composto por **três aplicações independentes e integradas**:

1. **`pvapp` (`portal.vagouapp.com`):** Marketplace e Portal do Consumidor final (Radar, geolocalização GIS, agendamentos rápidos).  
   - Repositório: [`https://github.com/nexuscrwd/Portal-VagouApp.git`](https://github.com/nexuscrwd/Portal-VagouApp.git)
2. **`mnvapp` / `vapp` (`meunegocio.vagouapp.com` / `*.vagouapp.com`):** Este projeto — App Operacional do Parceiro (Agenda, equipe, serviços, publicação de vagas e gestão do salão).  
   - Repositório: [`https://github.com/nexuscrwd/vagouapp.git`](https://github.com/nexuscrwd/vagouapp.git)
3. **`admvapp` (`adm.vagouapp.com` / `admin.vagouapp.com`):** Painel de Admin Master (Governança executiva, moderação de salões, verificação de conformidade fiscal e auditoria direta no banco Supabase).  
   - Repositório: [`https://github.com/nexuscrwd/admin.vagouapp.git`](https://github.com/nexuscrwd/admin.vagouapp.git)

---

## 🏗️ 1. Visão Geral da Pilha Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend UI** | React 19 + TypeScript | Interface declarativa, modular e orientada a componentes. |
| **Estilização** | Tailwind CSS v4 | Estilização utility-first com tema Dark Slate + Emerald. |
| **Ícones** | Lucide React | Biblioteca padronizada de ícones vetoriais. |
| **Animações** | Motion (`motion/react`) | Transições de tela, gavetas, modais e feedback de toque. |
| **Build & Dev Server** | Vite 6 + Express + TSX | Servidor Full-Stack com suporte a rotas API e SPA. |
| **IA Generativa** | `@google/genai` (Gemini SDK) | Análise arquitetural e extração estruturada de telas. |
| **Persistência / Cloud** | Supabase (Definido) | Banco de dados relacional (PostgreSQL) para multi-tenancy e gerenciamento de permissões (RBAC). (Atualmente mockado em memória/localStorage enquanto não conectado). |

---

## 📱 2. Modos de Operação do Aplicativo

O aplicativo possui dois modos operacionais principais controlados pelo estado global `appMode`:

### A. Modo Cliente (`AppMode: 'client'`)
Focado na experiência do usuário final que busca atendimento rápido por proximidade:
- **`HomeScreen`**: Feed principal com barra de stories do Radar, busca rápida, filtro por categorias e cards de vagas ativas ordenadas por urgência e distância.
- **`SalonProfileView`**: Micro-app do salão / estabelecimento com navegação em 4 abas 100% isoladas (`Início`, `Serviços`, `Agenda`, `Espaço/Equipe`), cabeçalho de marca e enquadramento total de tela.
- **`MapScreen`**: Visualização geoespacial (GIS) de salões próximos com raio de distância, filtros e cards flutuantes.
- **`OfferDetailScreen`**: Detalhe da oferta com fotos/vídeo, serviços inclusos, tempo de expiração e botão de reserva imediata.
- **`ConfirmationScreen`**: Tela de sucesso pós-reserva com protocolo de atendimento, mapa estático, QR code e rota.
- **`AgendaScreen`**: Histórico e lista de agendamentos confirmados do cliente com opção de cancelamento.
- **`ProfileScreen`**: Dados do usuário, preferências e configurações.

### B. Modo Parceiro / Estabelecimento (`AppMode: 'partner'`)
Focado na gestão de horários e publicação de vagas relâmpago:
- **`PartnerAgendaScreen`**: Visão diária da agenda por profissional, status dos atendimentos e publicação de vagas ociosas.
- **`PartnerScheduleConfigScreen`**: Configuração de horários de funcionamento, intervalos de almoço e escala por dia da semana.
- **`PartnerProfileScreen`**: Cadastro do salão, profissionais da equipe e configurações da conta.
- **`PartnerPublishModal`**: Modal ágil para lançar uma vaga imediata com desconto no feed e mapa.

---

## 🌐 3. Tecnologias GIS, Geolocalização & Mapas

1. **Cálculo de Proximidade:**
   - As ofertas possuem latitude e longitude (`lat`, `lng`).
   - A distância é calculada em relação à posição do usuário ou bairro central selecionado (ex: Itaquera - SP).
   - O app suporta ordenação por menor distância e exibição em formato amigável (`500m`, `1.2 km`).

2. **Visualização em Mapa (`MapScreen`):**
   - Renderização dos estabelecimentos com pins estilizados que destacam vagas ativas.
   - Drawer inferior sincronizado com o pin selecionado no mapa.

---

## ⚡ 4. Mecânica do "Radar de Vagas Imediatas"

As ofertas possuem um sistema dinâmico de mídia estruturado em 3 níveis:
1. **Nível 1 (Fallback Animado):** Utilizado quando o estabelecimento não enviou mídias reais. Exibe cartões gerados visualmente com gradientes da marca, badges dinâmicos e tipografia forte (`MediaFallbackCard`).
2. **Nível 2 (Carrossel de Fotos):** Apresentação com galeria de até 5 fotos reais do espaço/serviço.
3. **Nível 3 (Vídeo Vertical):** Experiência estilo stories em tela cheia com autoplay mudo e controle de áudio.

---

## 🏛️ 5. Ecossistema Descentralizado: Modelos de Negócio & Perfis de Consumidor

O ecossistema opera sob banco de dados Supabase unificado (`auth.users` global), atendendo tanto os aplicativos PWA White-label dos salões quanto o Portal Marketplace:

### A. 4 Modelos de Estabelecimentos Suportados:
1. **Prestador a Domicílio (Home Care / Delivery):** Não possui ponto comercial fixo. Exige endereço do cliente no agendamento e aplica taxa de deslocamento configurável (`home_delivery_travel_fee`). Exemplo: *Mariana Silva Nail & Lash*.
2. **Studio Solo (1 Cadeira / Autônomo com Ponto Físico):** O proprietário é o único profissional atendente. Agenda e faturamento 100% individualizados. Exemplo: *Studio Lucas Barbeiro*.
3. **Salão com Equipe (Dono + Profissionais):** Salão físico estruturado com dono e múltiplos colaboradores especialistas com agendas simultâneas e taxas de comissão. Exemplo: *Espaço Belle & Co.*.
4. **Rede Multi-Unidade (Mesmo Dono, Múltiplos Estabelecimentos):** O mesmo proprietário gerencia 2 ou mais filiais (compartilhando `owner_id`), cada uma com endereço e equipe própria. Exemplo: *Studio Elegance (Jardins & Moema)*.

### B. 4 Perfis de Consumidores Suportados:
1. **Homem (ex: Lucas Mendes):** Foco em barbearias, corte degradê e barba.
2. **Mulher (ex: Camila Fernandes):** Foco em mechas, manicure em gel e estética.
3. **Não-Binário / Inclusivo (ex: Alex Duarte):** Foco em design de sobrancelha e procedimentos modernos.
4. **Infantil / Dependente (ex: Theo Mendes, 7 anos):** Conta vinculada ao responsável com flags `is_dependent: true` e `dependent_name`. Permite ao pai/mãe agendar tanto para si quanto para dependentes.

---

## 📂 6. Estrutura de Pastas e Componentes

```
/
├── AGENTS.md                  # Diretrizes mestras da IA e protocolo dos 6 mandamentos
├── ARCHITECTURE.md            # Este arquivo - Arquitetura e fluxos do sistema
├── KNOWLEDGE_BASE.md          # Padrões validados, z-index e soluções consolidadas
├── CHANGELOG.md               # Histórico cronológico de modificações
├── metadata.json              # Configurações do AI Studio (nome, permissões)
├── server.ts                  # Servidor Express com API Gemini e proxy Vite
├── src/
│   ├── App.tsx                # Roteamento de telas, estado de cliente/parceiro e modais
│   ├── types.ts               # Tipos TypeScript compartilhados (Ofertas, Agenda, Telas)
│   ├── data.ts                # Mocks ricos de ofertas, salões e profissionais
│   ├── index.css              # Configuração global de Tailwind CSS v4
│   ├── components/            # Componentes modulares de tela e UI
│   ├── services/              # Serviços de integração (Gemini, Firebase)
│   └── utils/                 # Funções utilitárias (formatação, cálculos GIS)
```
