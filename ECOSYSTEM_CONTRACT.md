# 🏛️ ECOSYSTEM_CONTRACT.md — Contrato do Ecossistema Vagou

> **DOCUMENTO MESTRE DE COMPARTILHAMENTO (PAR CLIENTE & PAR EMPRESÁRIO)**  
> Este arquivo é a fonte única da verdade para a arquitetura, modelos de dados e fluxos de comunicação entre os três aplicativos que compõem a plataforma **Vagou**. Ambos os projetos compartilham o mesmo banco de dados e devem respeitar estritamente as definições deste contrato.

---

### 🔗 Repositórios Oficiais da Tríade no GitHub:
1. **Admin VagouApp (`admvapp`):** [`https://github.com/nexuscrwd/admin.vagouapp.git`](https://github.com/nexuscrwd/admin.vagouapp.git) — Backoffice Executivo & Gestão VAPP
2. **VagouApp Oficial / Meu Negócio (`vapp` / `mnvapp`):** [`https://github.com/nexuscrwd/vagouapp.git`](https://github.com/nexuscrwd/vagouapp.git) — App dos Estabelecimentos & Vitrines White-Label
3. **Portal VagouApp (`pvapp`):** [`https://github.com/nexuscrwd/Portal-VagouApp.git`](https://github.com/nexuscrwd/Portal-VagouApp.git) — Portal do Usuário & Radar Marketplace

---

## 🗺️ 1. Diagrama de Arquitetura do Ecossistema (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ECOSSISTEMA DE DUAS PONTAS                           │
└─────────────────────────────────────────────────────────────────────────────────┘

     [ APP CONSUMIDOR (Vagou) ]                       [ APP EMPRESÁRIO (Vagou Pro) ]
      Foco: Cliente / Descoberta                       Foco: Salão / Operacional
      Tecnologia: React + Tailwind v4                  Tecnologia: Ionic + Capacitor
      Identidade: Vagou Dark + Emerald                 Identidade: Theming Dinâmico (Salão)
           │                                                │
           │ 1. Busca Salões (GPS/Raio)                     │ 1. Dono/Profissional faz Login
           │ 2. Assiste Reels (5s)                          │ 2. Aplica Tokens de Cor e Logo
           │ 3. Clica em "Agendar Vaga"                     │ 3. Clica em "Publicar Vaga (5s)"
           │                                                │ 4. Recebe Notificação Sonora
           ▼                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS COMPARTILHADO (Supabase / Postgres)           │
│                                                                                 │
│   ┌─────────────────────┐    ┌──────────────────────┐    ┌──────────────────┐   │
│   │       salons        │    │    professionals     │    │  service_offers  │   │
│   │ (Dados & Branding)  │───<│  (Equipe & Escala)   │───<│ (Vagas do Radar) │   │
│   └──────────┬──────────┘    └──────────────────────┘    └────────┬─────────┘   │
│              │                                                    │             │
│              ▼                                                    ▼             │
│   ┌─────────────────────┐                                ┌──────────────────┐   │
│   │ salon_media_library │                                │   appointments   │   │
│   │ (Vídeos e Fotos 5s) │                                │ (Reservas Reais) │   │
│   └─────────────────────┘                                └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 2. Papel de Cada Aplicação no Ecossistema

### A. App Consumidor (`Vagou`) — *Este Repositório*
- **Público:** Clientes finais procurando serviços de beleza e bem-estar para agora ou hoje.
- **Identidade Visual:** **100% Marca Vagou** (Fundo Dark `slate-950`, cartões `slate-900`, destaques em `emerald-500` e acentos em `emerald-400`).
- **Telas Principais:**
  - `HomeScreen`: Feed estilo Reels imersivo com vídeos de 5s, stories do radar e lista de serviços disponíveis.
  - `MapScreen`: Mapa com geolocalização e raio de distância.
  - `ConfirmationScreen`: Protocolo de agendamento com QR Code e rota GPS.
  - `AgendaScreen`: Histórico e agendamentos futuros do cliente.

### B. App Empresário (`Vagou Pro`) — *Projeto no Ionic Studio*
- **Público:** Donos de salões, barbeiros, manicures, cabeleireiros e esteticistas.
- **Identidade Visual:** **White-label Dinâmico (Theming)**. Carrega o logo, o nome e as cores primárias do salão autenticado.
- **Telas Principais:**
  - `PartnerAgendaScreen`: Grade de horários do dia com visualização rápida por profissional e status.
  - `FastPublishModal`: Disparo de vaga relâmpago em 2 toques (seleciona horário livre + escolhe vídeo da biblioteca pré-salva).
  - `PartnerScheduleConfigScreen`: Configuração de expediente, pausas de almoço e escala semanal.
  - `SalonMediaLibraryScreen`: Gestão dos vídeos curtos (5s) e fotos institucionais para o radar.
  - `PartnerFinancialScreen`: Resumo de atendimentos e comissões da equipe.

---

## 🎨 3. Especificação do Theming Dinâmico (White-Label)

No **App Empresário**, as cores e a marca são injetadas no momento do login através de variáveis CSS raiz (`CSS Custom Properties`).

### Estrutura de Branding (`JSON` na tabela `salons`):
```json
{
  "logo_url": "https://storage.vagou.app/salons/vintage-barber/logo.png",
  "primary_color": "#D97706",
  "secondary_color": "#1E293B",
  "background_color": "#0B0F17",
  "accent_color": "#F59E0B",
  "text_primary": "#FFFFFF",
  "text_muted": "#94A3B8"
}
```

### Injeção no Ionic/CSS:
```css
:root {
  --brand-primary: var(--salon-primary, #10B981); /* fallback emerald */
  --brand-secondary: var(--salon-secondary, #0F172A);
  --brand-bg: var(--salon-bg, #020617);
  --brand-accent: var(--salon-accent, #34D399);
}
```

---

## 📐 4. Dimensões, Layout & Configurações de Hardware

| Parâmetro | App Consumidor | App Empresário (Ionic) |
| :--- | :--- | :--- |
| **Padrão de Layout** | Mobile-first estrito (`max-w-md mx-auto` centralizado em desktop) | Mobile-first com suporte a modo bancada/tablet (`max-w-4xl` em telas amplas) |
| **Largura Alvo** | `360px` a `430px` (smartphones) | `375px` a `820px` (smartphones e tablets de balcão) |
| **Alvos de Toque** | Mínimo `44px × 44px` | Mínimo `48px × 48px` (operação rápida entre clientes) |
| **Safe Areas** | `padding-top: env(safe-area-inset-top)` e `padding-bottom: env(safe-area-inset-bottom)` em ambos |
| **Som de Notificação** | Discreto (confirmação no app) | **Alerta Sonoro Alto** no Ionic via Capacitor quando chega agendamento relâmpago |

---

## 🗄️ 5. Dicionário de Dados Compartilhado (Contrato de Banco)

### Tabela: `salons` (Estabelecimentos)
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único |
| `name` | `VARCHAR(100)` | Nome da empresa |
| `slug` | `VARCHAR(100)` (Unique) | URL para PWA do salão |
| `latitude` | `DECIMAL(10, 8)` | Posição geográfica |
| `longitude` | `DECIMAL(11, 8)` | Posição geográfica |
| `address` | `TEXT` | Endereço completo |
| `neighborhood`| `VARCHAR(60)` | Bairro de localização |
| `city` | `VARCHAR(60)` | Cidade |
| `phone_whatsapp`| `VARCHAR(20)` | WhatsApp para disparo de avisos |
| `branding` | `JSONB` | Tokens de cores, logo e capas |
| `is_verified` | `BOOLEAN` | Selo de verificado Vagou |

### Tabela: `professionals` (Membros da Equipe)
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador do profissional |
| `salon_id` | `UUID` (FK -> salons.id) | Salão ao qual pertence |
| `name` | `VARCHAR(80)` | Nome do profissional |
| `avatar_url` | `TEXT` | Foto de perfil |
| `specialties` | `TEXT[]` | Categorias (`cabelo`, `barba`, `unhas`) |
| `color_hex` | `VARCHAR(7)` | Cor de identificação na grade da agenda |
| `slot_minutes` | `INT` | Duração padrão de cada atendimento (ex: 45) |
| `is_active` | `BOOLEAN` | Ativo na equipe |

### Tabela: `service_categories` (Categorias Mestres de Serviços)
> **Hierarquia:** As categorias funcionam como grupos pai criados pelo salão/profissional ou predefinidos pela plataforma. Os serviços cadastrados operam como subcategorias desse grupo.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador da categoria |
| `salon_id` | `UUID` (FK -> salons.id) | Salão proprietário (ou `NULL` para categorias globais) |
| `name` | `VARCHAR(60)` | Nome da categoria mestre (ex: `Cabelo`, `Barba`, `Unhas`, `Estética`) |
| `sort_order` | `INT` | Ordem de exibição no catálogo e no carrossel |
| `is_active` | `BOOLEAN` | Categoria ativa no catálogo (`true`/`false`) |

### Tabela: `catalog_services` (Serviços e Subcategorias do Catálogo)
> **Mídia e Publicação:** Suporta galeria de até 5 fotos em alta resolução e 1 vídeo curto de até 5 segundos em loop, permitindo ao profissional escolher o modo de publicação do anúncio: `'static'` (foto estática), `'slideshow'` (slide/carrossel rotativo das fotos) ou `'video'` (vídeo 5s em loop contínuo).

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador do serviço |
| `salon_id` | `UUID` (FK -> salons.id) | Salão ao qual pertence |
| `category_id` | `UUID` (FK -> service_categories.id) | Categoria mestre associada |
| `category_name`| `VARCHAR(60)` | Nome denormalizado da categoria para queries rápidas |
| `title` | `VARCHAR(100)` | Nome da subcategoria/serviço (ex: `Corte Degradê na Tesoura`) |
| `description` | `TEXT` | Detalhes do serviço, produtos ou benefícios |
| `price` | `NUMERIC(10,2)`| Preço base em Reais (R$) |
| `duration` | `VARCHAR(20)` | Duração estimada (ex: `40 min`, `1h`) |
| `display_mode` | `VARCHAR(20)` | Modo de exibição: `'static'`, `'slideshow'` ou `'video'` |
| `photos` | `TEXT[]` | Galeria de até 5 fotos do serviço (1ª foto é a capa) |
| `image_url` | `TEXT` | URL da foto principal (fallback de capa) |
| `media_type` | `VARCHAR(10)` | Tipo de mídia principal: `'image'` ou `'video'` |
| `video_url` | `TEXT` | URL do vídeo de até 5s em loop (MP4/WebM) |
| `video_duration_seconds` | `NUMERIC(3,1)` | Duração exata do vídeo (teto recomendado: 5.0 segundos) |
| `is_active` | `BOOLEAN` | Serviço disponível para agendamento |

### Tabela: `service_offers` (Vagas do Radar)
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador da vaga |
| `salon_id` | `UUID` (FK) | Estabelecimento ofertante |
| `professional_id` | `UUID` (FK) | Profissional com a cadeira livre |
| `service_title` | `VARCHAR(100)` | Título (ex: "Degradê + Barboterapia") |
| `category` | `VARCHAR(30)` | `cabelo`, `barba`, `unhas`, `estetica`, `beleza` |
| `original_price` | `NUMERIC(10,2)`| Preço de tabela |
| `price` | `NUMERIC(10,2)`| Preço com desconto relâmpago |
| `date_str` | `DATE` | Data do atendimento (`YYYY-MM-DD`) |
| `start_time` | `TIME` | Horário inicial da vaga (`HH:MM`) |
| `end_time` | `TIME` | Horário final previsto (`HH:MM`) |
| `video_url` | `TEXT` | URL do vídeo de 5s da biblioteca |
| `status` | `VARCHAR(20)` | `AVAILABLE`, `BOOKED`, `EXPIRED`, `CANCELLED` |
| `expires_at` | `TIMESTAMPTZ` | Momento exato em que a oferta sai do radar |

### Tabela: `appointments` (Agendamentos Efetivados)
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador da reserva |
| `protocol_code` | `VARCHAR(12)` | Código amigável (ex: `VG-9482`) |
| `offer_id` | `UUID` (FK) | Vaga original |
| `salon_id` | `UUID` (FK) | Salão |
| `professional_id` | `UUID` (FK) | Profissional |
| `client_name` | `VARCHAR(100)` | Nome do cliente |
| `client_phone` | `VARCHAR(20)` | Telefone do cliente |
| `status` | `VARCHAR(20)` | `CONFIRMADO`, `EM_ATENDIMENTO`, `CONCLUIDO`, `CANCELADO`, `NO_SHOW` |
| `booked_at` | `TIMESTAMPTZ` | Carimbo de data/hora do clique |

---

## ⚡ 6. Máquina de Estados da Vaga Relâmpago

```
   [ Cadeira Vazia ]
          │
          ▼
   ( App Empresário ) ──► Lança Vaga no Radar ──► status: 'AVAILABLE'
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           ▼                                                       ▼
                [ Cliente Clica no Vagou ]                               [ Tempo Esgotado ]
                           │                                                       │
                           ▼                                                       ▼
                   status: 'BOOKED'                                        status: 'EXPIRED'
                           │                                                 (Some do feed)
                           ▼
              ( Toca Alarme no Salão )
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
     [ Cliente Comparece ]       [ Cliente Não Foi ]
             │                           │
             ▼                           ▼
    status: 'CONCLUIDO'          status: 'NO_SHOW'
```

---

## 🔄 7. Protocolo de Sincronização entre Equipes / Agentes

Sempre que uma alteração exigir nova coluna no banco, novo status ou mudança de rota:
1. Altere este arquivo (`ECOSYSTEM_CONTRACT.md`).
2. Registre a mudança no `CHANGELOG.md` com a tag `[ECOSYSTEM_UPDATE]`.
3. Copie o arquivo atualizado para o repositório irmão para manter os agentes de IA perfeitamente alinhados.
