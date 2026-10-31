# ⚡ DIRETIVA SOBERANA DO AGENTE HERMES — VAGOUAPP (`mnvapp`)

> **IDENTIDADE DO PROJETO ATUAL:** Este repositório é o **`mnvapp` — VagouApp Oficial / Meu Negócio (`meunegocio.vagouapp.com` e Vitrines White-Label `*.vagouapp.com`)**, integrante da Tríade Oficial VagouApp.
>
> **PAPEL DO HERMES AGENT:** Você atua com **autoridade técnica soberana** na leitura profunda de código, caça e correção preventiva de erros (Self-Healing), engenharia especialista em **GIS / RTLS / GPS / Mapas / Google Maps Platform** e orquestração de automações externas via **n8n, Evolution API, WAHA (WhatsApp HTTP API), Webhooks e Supabase**.

---

## 🏛️ 1. MAPA DA TRÍADE VAGOUAPP (3 PROJETOS CONECTADOS AO MESMO SUPABASE)

1. **`mnvapp` (`meunegocio.vagouapp.com` / `*.vagouapp.com`) — [ESTE PROJETO]:**
   - **Repositório:** `https://github.com/nexuscrwd/vagouapp.git`
   - **Escopo:** App do Estabelecimento/Parceiro (Gestão de Agenda, Equipe, Serviços, Caixa, Publicação de Vagas Relâmpago no Radar) + **Vitrine Pública White-Label do Salão** (Micro-App do salão, Agendamento Rápido e Cockpit de Navegação GPS/RTLS ao vivo do cliente até a cadeira do profissional).
2. **`pvapp` (`portal.vagouapp.com`):**
   - **Repositório:** `https://github.com/nexuscrwd/Portal-VagouApp.git`
   - **Escopo:** Portal do Consumidor & Radar Marketplace georreferenciado.
3. **`admvapp` (`adm.vagouapp.com`):**
   - **Repositório:** `https://github.com/nexuscrwd/admin.vagouapp.git`
   - **Escopo:** Painel Corporativo de Admin Master, moderação de salões (`is_verified`, `status`), auditoria e infraestrutura DNS/SSL.

### 📡 Lei Suprema de Sincronia (O 7º Mandamento — Tríade Sync)
Toda e qualquer alteração em tabelas do Supabase, payloads de Webhook, contratos de API (`server.ts`), `localStorage` ou componentes compartilhados realizada neste projeto (`mnvapp`) exige a emissão obrigatória do bloco:
`# 🏛️ COMUNICADO TÉCNICO INTER-PROJETOS: [Nome da Mudança]` para **`pvapp`** e **`admvapp`**.

---

## 📂 2. ORDEM OBRIGATÓRIA DE LEITURA DO CÓDIGO PELO HERMES

Ao iniciar qualquer inspeção, diagnóstico ou automação neste repositório, o Hermes DEVE ler os arquivos exatamente nesta ordem:

1. **Governança & Regras de Negócio:**
   - `AGENTS.md` e `GEMINI.md`: Os 7 Mandamentos, regras de UI/UX, contraste e GIS/RTLS.
   - `HERMES.md` (este documento): Diretrizes de automação, auditoria soberana e integrações.
   - `MASTER_APPROVALS_AND_GUIDELINES.md`: Manual consolidado de aprovações da Tríade.
   - `ARCHITECTURE.md`, `KNOWLEDGE_BASE.md` e `CHANGELOG.md`: Histórico técnico e soluções homologadas.
2. **Camada Backend & Orquestração (`server.ts`):**
   - Servidor Express + Vite Middleware na porta `3000`.
   - Rotas de Geocodificação, Snap-to-Road e Cascata de Roteamento Viário de 5 Camadas (`/api/geo/*` e `/api/maps/*`).
   - Ponto oficial para montagem dos gateways `/api/webhooks/n8n` e `/api/integrations/whatsapp` (Evolution API / WAHA).
3. **Camada de Dados, Estado & Serviços:**
   - `src/lib/supabase.ts`: Cliente Supabase, helpers de validação e persistência.
   - `src/services/googleMapsService.ts`: Decodificador de polilinhas, cálculo de rotas, geocodificação reversa e Snap-to-Road.
   - `src/context/AppContext.tsx` e `src/context/ThemeContext.tsx`: Estado global do estabelecimento, agendamentos, vagas do radar e tema escuro/claro.
4. **Camada de Interface & Motor Cartográfico RTLS (`src/components/`):**
   - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`: Motor de navegação vertical **Course-Up (`Frente p/ Cima`)**, Map-Matching ortogonal contínuo, telemetria GPS (`km/h`, `KM`, `HH:MM`) e detecção de chegada (`<= 150m`).
   - `src/components/live-tracking/LiveTrackingModal.tsx` e `RouteSimulatorModal.tsx`: Cockpit de deslocamento do cliente e simulador de partida (`Local Atual`, `De Casa`, `Outro Local`).
   - `src/components/SalonProfileView.tsx` e `SalonBookingModal.tsx`: Vitrine White-Label isolada por abas e fluxo de agendamento com rodapé fixo (`sticky bottom-0 z-20`).

---

## 🔍 3. PROTOCOLO SOBERANO DE BUSCA DE ERROS & AUTO-CURA (SELF-HEALING)

Sempre que o Hermes auditar o projeto, ele deve executar as 5 verificações abaixo:

1. **Integridade TypeScript & Compilação Limpa:**
   - Executar `npm run lint` (`tsc --noEmit`) e `npm run build`.
   - Eliminar imediatamente imports não utilizados, variáveis órfãs, tipagens quebradas ou logs temporários.
2. **Auditoria Especialista GIS / RTLS / GPS / Google Maps Platform:**
   - **Proibição Absoluta de Linha Reta:** Verificar se `InteractiveGoogleRouteMap.tsx` e `server.ts` jamais desenham polilinhas de apenas 2 vértices (`[origin, dest]`). Toda rota deve ter `> 2` pontos provenientes da cascata viária real (`Google Routes API v2` ➔ `FOSSGIS OSRM` ➔ `Global OSRM` ➔ `Valhalla OSM` ➔ malha arterial de 28 pontos).
   - **Navegação Vertical Course-Up & Zero Tremor:** Garantir que o palco do mapa (`w-[164%] h-[164%] inset-[-32%]`) gire por `-mapBearingDeg` (alinhando a rua para CIMA `0°`), que fotos/badges usem `--map-counter-rotate`, e que o evento `deviceorientation` (bússola) **JAMAIS** chame `lmap.panTo()`.
   - **Zero Costuras/Linhas entre Tiles:** Confirmar zoom inteiro (`zoom: 17`, `zoomSnap: 1`) e filtro escuro aplicado no contêiner `.vagou-map-dark .leaflet-tile-pane` em `src/index.css` (nunca em `.leaflet-tile` individual).
3. **Auditoria de Segurança de Credenciais:**
   - Chaves sensíveis (`GOOGLE_MAPS_API_KEY`, `EVOLUTION_API_KEY`, `WAHA_API_KEY`, `N8N_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) devem residir **exclusivamente no backend (`server.ts`)** e nunca ser expostas no bundle cliente com prefixo `VITE_`.
4. **Auditoria de Design System & Contraste:**
   - **Trava do Fundo Verde:** Qualquer elemento com `bg-emerald-500`, `bg-emerald-600` ou `bg-[#20C933]` DEVE conter `text-white` (texto e ícones brancos puros).
   - **Ícones Estritos:** 100% dos ícones importados de `lucide-react` (zero SVGs manuais inline).
   - **Zero "Box dentro de Box":** Proibido aninhar cards com borda dentro de contêineres com borda.
   - **Síntese Mobile:** Botões de partida sempre objetivos (`Local Atual`, `De Casa`, `Outro Local`) e spinner de carregamento sem texto redundante (`<Loader2 className="animate-spin" />`).

---

## 🤖 4. ARQUITETURA DE INTEGRAÇÃO: n8n + EVOLUTION API + WAHA + WEBHOOKS

O Hermes tem papel soberano para conectar o **`mnvapp`** ao ecossistema de automação e WhatsApp seguindo esta arquitetura:

### A. Fluxo de Comunicação Blindado
```text
[VagouApp Frontend (React)]
       │ (POST /api/webhooks/event)
       ▼
[VagouApp Backend (server.ts)] ──(Assinatura HMAC / Secret)──► [n8n Workflow Engine]
                                                                      │
                                         ┌────────────────────────────┴────────────────────────────┐
                                         ▼                                                         ▼
                           [Evolution API v2 (WhatsApp)]                             [WAHA - WhatsApp HTTP API]
                      (Confirmações, Lembretes, Alerta RTLS)                    (Disparo Radar VIP, Avisos ao Salão)
```

### B. Variáveis de Ambiente Padronizadas (`.env.example` / `server.ts`)
```env
# Google Maps Platform (Server-Side)
GOOGLE_MAPS_API_KEY=

# Orquestrador n8n
N8N_WEBHOOK_BASE_URL=https://n8n.seudominio.com/webhook/vagouapp
N8N_WEBHOOK_SECRET=

# Evolution API (WhatsApp Oficial do Salão / Notificações)
EVOLUTION_API_URL=https://evolution.seudominio.com
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=vagouapp-main

# WAHA (WhatsApp HTTP API)
WAHA_API_URL=https://waha.seudominio.com
WAHA_API_KEY=
WAHA_SESSION_NAME=default
```

### C. Os 6 Eventos Oficiais do `mnvapp` para n8n / Evolution API / WAHA

| Código do Evento (`eventType`) | Onde Nasce no `mnvapp` | Ação Automática no n8n / Evolution API / WAHA |
| :--- | :--- | :--- |
| **`appointment.created`** | `SalonBookingModal.tsx` | Envia mensagem WhatsApp para o **Cliente** (com resumo + link direto do GPS `*.vagouapp.com`) e para o **Profissional/Salão**. |
| **`appointment.reminder_1h`** | Cron / n8n Schedule | 60 min antes do horário, envia botão/link no WhatsApp do cliente: *"Toque aqui para iniciar sua navegação GPS até o salão"*. |
| **`radar.flash_slot.published`** | Painel do Parceiro (Meu Negócio) | Quando o salão solta uma Vaga Relâmpago, dispara aviso imediato via WAHA/Evolution para clientes que favoritaram aquele salão. |
| **`rtls.client_departed`** | `LiveTrackingModal.tsx` | Quando o cliente inicia o deslocamento (`Local Atual` ou `De Casa`), avisa o profissional no WhatsApp com a distância (`KM`) e o ETA (`HH:MM`). |
| **`rtls.client_arriving`** | `InteractiveGoogleRouteMap.tsx` (`<= 150m`) | Quando `hasReachedDestination === true` (cliente a menos de 150m da porta), dispara alerta instantâneo no WhatsApp do barbeiro/recepção: *"⚡ Seu cliente está chegando na porta!"*. |
| **`appointment.completed`** | Painel do Parceiro (Caixa/Agenda) | 30 min após a conclusão do serviço, envia mensagem de pós-venda e link de avaliação / retorno agendado. |

### D. Contrato JSON Oficial de Disparo (`VagouWebhookEnvelope`)
Todo disparo gerado pelo Hermes em `server.ts` deve utilizar `AbortSignal.timeout(5000)`, deduplicação por `eventId` e o seguinte schema:

```json
{
  "eventId": "evt_20261030_9f8a7b6c",
  "eventType": "rtls.client_arriving",
  "sourceApp": "mnvapp",
  "timestamp": "2026-10-30T20:40:00.000Z",
  "tenant": {
    "id": "salon-uuid",
    "slug": "studio-prime",
    "name": "Studio Prime",
    "whatsapp": "5511999999999"
  },
  "appointment": {
    "id": "apt-uuid",
    "serviceName": "Corte + Barba Terapia",
    "professionalName": "Lucas",
    "scheduledAt": "2026-10-30T20:45:00.000Z",
    "price": 85.0
  },
  "client": {
    "name": "Carlos Eduardo",
    "whatsapp": "5511988888888"
  },
  "rtlsTelemetry": {
    "originMode": "current_location",
    "currentLat": -23.4538,
    "currentLng": -46.5333,
    "speedKmh": 28,
    "remainingDistanceKm": 0.1,
    "remainingMinutes": 1,
    "hasReachedDestination": true,
    "trackingUrl": "https://studio-prime.vagouapp.com/?tracking=apt-uuid"
  }
}
```

### E. Regras Anti-Banimento WhatsApp (Evolution API & WAHA)
1. **Normalização de JID:** Converter sempre números brasileiros (`11988888888` ➔ `5511988888888@s.whatsapp.net` na Evolution API ou `5511988888888@c.us` no WAHA), tratando o 9º dígito conforme DDD.
2. **Simulação Humana (`sendPresence`):** Antes de enviar qualquer texto pela Evolution API ou WAHA, acionar o estado `composing` ("digitando...") por `1500ms` a `2800ms`.
3. **Trava de Idempotência no Geofence (`<= 150m`):** O evento `rtls.client_arriving` deve ser disparado **uma única vez por agendamento** (usando flag de controle `arrivalNotifiedRef` / cache no `server.ts`), impedindo múltiplos envios caso o GPS do cliente oscile próximo à entrada do salão.
