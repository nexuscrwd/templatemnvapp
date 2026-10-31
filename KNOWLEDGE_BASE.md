# 🧠 Base de Conhecimento & Padrões Consolidados — Vagou

Este documento reúne soluções técnicas testadas, padrões de layout e configurações que deram certo no aplicativo **Vagou**, permitindo que futuras intervenções vão direto ao ponto sem retrabalho.

---

### 🔗 Repositórios Oficiais da Tríade Vagou no GitHub:
1. **Admin VagouApp (`admvapp`):** [`https://github.com/nexuscrwd/admin.vagouapp.git`](https://github.com/nexuscrwd/admin.vagouapp.git) — Backoffice Executivo & Gestão VAPP
2. **VagouApp Oficial / Meu Negócio (`vapp` / `mnvapp`):** [`https://github.com/nexuscrwd/vagouapp.git`](https://github.com/nexuscrwd/vagouapp.git) — App dos Estabelecimentos & Vitrines White-Label
3. **Portal VagouApp (`pvapp`):** [`https://github.com/nexuscrwd/Portal-VagouApp.git`](https://github.com/nexuscrwd/Portal-VagouApp.git) — Portal do Usuário & Radar Marketplace

---

## 🎯 1. Padrão de Camadas & Hierarquia de `z-index` (Solução Validada)

### O Problema Resolvido:
Os badges de urgência dos cards (*"VAGA AGORA"*, *"VAGA RELÂMPAGO"*) e botões de mídia estavam se sobrepondo à barra de categorias do topo durante a rolagem do feed.

### A Solução Padronizada:
1. **Cabeçalho Unificado no Topo (`HomeScreen.tsx`):**
   - Agrupar logo, atalhos, campo de busca e barra de categorias dentro de um **único contêiner `sticky top-0 z-40`**.
   - Fundo com `bg-slate-950/95` e `backdrop-blur-md` para isolar visualmente qualquer elemento que passe por baixo.
2. **Cards do Feed (`RadarOfferCard.tsx`):**
   - Contêiner raiz do card com `relative z-0`.
   - Controles internos (botão de som, setas de navegação do carrossel, badges) com `z-10`.
   - **Resultado:** O feed rola suavemente por trás de todo o bloco de categorias e busca sem conflito visual.

---

## 🎨 2. Paleta de Cores & Design System Oficial (Manual de Identidade)

- **Verde Vagou Principal:** `#20C933` (RGB: 32, 201, 51 | Destaques, botões ativos, check)
- **Verde Escuro Institucional:** `#087A2A` (RGB: 8, 122, 42 | Gradientes e sombra de marca)
- **Verde Claro Disponibilidade:** `#DFF7E3` (RGB: 223, 247, 227 | Tags suaves e fundos de badges)
- **Grafite Vagou (Fundo/Superfícies):** `#151A1E` (RGB: 21, 26, 30 | Fundo do app, containers escuros)
- **Branco:** `#FFFFFF`
- **Tipografia:** Família `Poppins` (Bold 700, Medium 500, Regular 400).
- **Regra de Contraste e Temperatura Cromática (Fontes & Fundos):**
  - **Fontes sobre fundos de cores quentes:** Em superfícies quentes (âmbar, amarelo, laranja, vermelho ou rose, como `bg-amber-100`, `bg-amber-50`, `bg-rose-100`), a tipografia e ícones **devem ser de tom frio** (`text-slate-900`, `text-slate-950`). É proibido usar texto quente sobre fundo quente (ex: `text-amber-800` em `bg-amber-50`).
  - **Fontes sobre fundos de cores frias:** Em superfícies frias/escuras (`bg-slate-950`, `#151A1E`, `bg-slate-900`), destaques e alertas de urgência adotam **temperatura quente** (`text-amber-400`, `text-rose-400`, `text-orange-400`) para corte térmico e visibilidade imediata.
- **Slogan Oficial:** *"Vagou achou."* (Sempre com o ponto final).
- **Componentes Oficiais:**
  - `src/components/VagouLogo.tsx`: Suporta `variant="header"`, `variant="full"`, `variant="icon"`, `variant="splash"`.
  - `src/components/SplashScreen.tsx`: Splash screen com o "V" e slogan na inicialização.

---

## 📱 3. Padrões de Responsividade e Mobile-First

- A aplicação foi desenhada para visualização ideal em tela móvel (estilo app nativo PWA), centralizada com contêiner max-width quando visualizada no desktop.
- Elementos fixos inferiores (`BottomNav`, `PartnerBottomNav`) utilizam `fixed bottom-0` ou `sticky` com compensação de padding `pb-24` na tela para evitar que o conteúdo seja cortado pelo rodapé.

---

## 🧹 4. Checklist da "Limpeza Pós-Obra" (Clean Code)

Antes de finalizar qualquer tarefa, passe por este checklist mental:
- [ ] Foram removidos imports de ícones ou bibliotecas que não estão sendo usados no arquivo?
- [ ] Foram removidas variáveis ou estados intermediários de teste?
- [ ] As classes Tailwind estão limpas e sem regras duplicadas/conflitantes?
- [ ] O `npm run lint` (`tsc --noEmit`) rodou com **zero erros**?
- [ ] O `npm run build` compilou com sucesso?
- [ ] O arquivo `CHANGELOG.md` foi devidamente atualizado?

---

## ⚡ 5. Padrão Consolidado: Deploy no Cloudflare Workers (Static Assets)

### Configuração Validada do `wrangler.toml`:
```toml
name = "vagouv1"
compatibility_date = "2024-09-23"

# Cloudflare Workers com Static Assets (SPA)
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

### Regras Críticas de Compatibilidade:
1. **Zero `_redirects` em Workers:** Arquivos `_redirects` com regras do tipo `/* /index.html 200` geram erro `[code: 100324]` (infinite loop). O roteamento SPA é feito exclusivamente por `not_found_handling = "single-page-application"` no `wrangler.toml`.
2. **Sem `binding = "ASSETS"` em workers apenas de assets:** O binding é proibido em workers sem script de entrada (`main`).
3. **Gerenciamento de Lockfiles:** `bun.lock` e `package-lock.json` são ignorados no repositório (`.gitignore`) para evitar que a diferença de versão do Bun/npm trave a instalação no runner CI do Cloudflare (`bun install` dinâmico em 5s).
4. **Comandos no painel Cloudflare:**
   - **Build command:** `bun run build`
   - **Deploy command:** `npx wrangler deploy`

---

## 🧭 6. Padrão de Ícones Semânticos & Navegação no Micro-App do Estabelecimento

Padrão oficial de ícones (`lucide-react`) validado para o ecossistema e visualização exclusiva de salão/barbearia:

| Seção / Finalidade | Ícone Primário | Ícone Alternativo / Condicional | Regra de Aplicação |
| :--- | :--- | :--- | :--- |
| **Agenda & Horários** | `Calendar` | `Clock`, `Zap` | Usado para a aba **Agenda**, botão de conversão **HORÁRIOS HOJE** e seleção de slots. |
| **Cardápio de Serviços** | `Scissors` | `Sparkles` | Usado para a aba **Serviços** e catálogo completo de procedimentos. |
| **Equipe / Profissional** | `Users` | `UserCheck` | **Dinâmico:** se houver 2 ou mais profissionais, exibe label *"Equipe"* com `Users`. Se for profissional autônomo individual, exibe label *"Perfil"* com `UserCheck`. |
| **Espaço / Modalidade** | `Store` | `Car` (Home Care) / `MapPin` | **Dinâmico:** para espaço físico/salão fixo, exibe label *"Espaço"* com `Store`. Para atendimento em domicílio/home care, exibe label *"Atendimento"* com `Car`. |
| **Retorno ao Radar** | `ArrowLeft` | — | Botão compacto e sutil de retorno ao Radar do Vagou no cabeçalho do micro-app. |
| **Ações de Cabeçalho** | `Heart` (Favoritar), `Bell` (Notificações), `Menu` (Configurações) | — | Posicionados à direita com dimensões compactas (`w-8 h-8 rounded-lg`). |
| **Alternância de Tema** | `Sun` (Modo Claro), `Moon` (Modo Escuro) | — | Alternador rápido no cabeçalho e na gaveta de configurações para alternar entre Dark Slate e Light Pearl. |

---

## 🌓 7. Padrão de Cores & Conversão para Tema Claro (Light Mode & Dark Mode)

Para oferecer uma experiência visual refinada e adaptável sem perder a elegância da identidade visual, o aplicativo adota um sistema dinâmico de temas provido por `ThemeContext`:

### A. Escala Cromática: Modo Escuro vs. Modo Claro

| Elemento | Tema Escuro (Dark Slate) | Tema Claro (Light Pearl) | Justificativa de UX/UI |
| :--- | :--- | :--- | :--- |
| **Fundo Global (`main`)** | `bg-slate-950` / `#151A1E` | `bg-slate-50` (Perolado suave) | Evita o branco puro `#FFF` ofuscante, mantendo conforto ótico. |
| **Superfícies & Cards** | `bg-slate-900/90` | `bg-white` com sombra fina `shadow-xs` | Cria elevação dimensional limpa sem necessidade de bordas pesadas. |
| **Bordas & Divisores** | `border-slate-800` | `border-slate-200` | Delimitação sutil e equilibrada. |
| **Texto Principal** | `text-white` / `text-slate-100` | `text-slate-900` | Contraste máximo que atende aos critérios WCAG AA. |
| **Texto Secundário / Apoio** | `text-slate-400` | `text-slate-500` / `text-slate-600` | Hierarquia visual de leitura com excelente legibilidade. |
| **Botão de Destaque ("HORÁRIOS HOJE")** | `bg-gradient-to-r from-emerald-600 via-[#20C933] to-emerald-500 text-white shadow-emerald-500/20` | `bg-gradient-to-r from-emerald-600 to-[#1eb72e] text-white shadow-emerald-600/20` | Elimina o texto preto pesado sobre o verde, garantindo sofisticação e relevo em ambos os temas. |
| **Abas Inativas** | `bg-slate-900/80 text-slate-300 border-slate-800` | `bg-white text-slate-700 border-slate-200 hover:bg-slate-50` | Contraste refinado, sem ofuscar a aba ativa. |
| **Abas Ativas** | `bg-gradient-to-b from-emerald-500/20 to-slate-900 text-emerald-400 border-emerald-500/60` | `bg-emerald-50 text-emerald-700 border-emerald-500/50 shadow-xs` | Indicação imediata da seção em foco. |

### B. Regras de Ouro de Execução Visual (Anti-Slop):
1. **Arredondamento Global Unificado de 4px (`rounded: 4px`):** Todos os contêineres, caixas, cards, botões, modais, inputs e superfícies da aplicação adotam estritamente o raio de curvatura de **4px** configurado centralmente no `@theme` (`--radius-*: 4px`). Isso garante coerência geométrica cirúrgica e elegância técnica em todas as telas.
2. **Sombras Finas e Sutis:** Uso exclusivo de sombras delicadas (`shadow-xs`, `shadow-sm`, `shadow-emerald-500/15`). Nunca usar sombras pretas opacas ou bordas grossas desnecessárias.
3. **Sem Preto sobre Verde:** Textos sobre botões esmeralda ou verde Vagou devem utilizar **branco puro com leve micro-sombra (`text-white drop-shadow-xs`)** ou grafite ultra-escuro com tipografia pesada, evitando sensações de peso visual ou baixa nobreza.
4. **Transições de Tela Suaves:** Todas as trocas de seção no micro-app do salão e na navegação utilizam `motion/react` com `AnimatePresence`, transições de opacidade (`fade`) e translação vertical sutil (`y: 4 -> 0`), garantindo fluidez premium.

---

## 🏛️ 8. Padrão Estrutural: Micro-App do Estabelecimento (`SalonProfileView.tsx`)

### O Problema Evitado:
Pilhas de rolagem contínua (`snap-y`) ou empilhamento vertical com scroll suave causavam vazamentos visuais entre seções (elementos de serviços ou agenda aparecendo na tela de início), descolamento do cabeçalho secundário (`SectionHeader`) e barras de rolagem indesejadas no mobile.

### A Estrutura Padrão Obrigatória:
1. **Contêiner Raiz 100% Enquadrado:**
   - O elemento pai do componente adota `w-full h-full flex flex-col overflow-hidden`.
   - O cabeçalho principal do salão é fixado no topo com `sticky top-0 z-40 shrink-0`.
2. **Área Útil com Isolamento Absoluto por Aba (`activeTab`):**
   - A área de exibição ocupa `flex-1 min-h-0 w-full relative overflow-hidden flex flex-col`.
   - Utilização de `AnimatePresence mode="wait"` onde **apenas a aba ativa (`home`, `servicos`, `vagas`, `espaco`) é montada no DOM**.
   - Cada aba filha encapsula seu próprio contêiner com `w-full h-full flex flex-col overflow-hidden`.
3. **Encaixe Perfeito do `SectionHeader`:**
   - O `SectionHeader` é montado como `shrink-0 w-full` imediatamente abaixo do cabeçalho principal, garantindo contato visual direto sem vão, descolamento ou sobreposição.
4. **Zero Vazamento & Responsividade Total:**
   - Ao trocar de aba pelo menu inferior (`BottomNav`), a transição ocorre instantaneamente com transição suave de opacidade (`opacity: 0 -> 1`), mantendo a altura exata entre o topo e o rodapé em 100% dos smartphones.

---

## 🚫 9. Diretriz Anti-Nesting: Proibição de "Box dentro de Box" e Bordas Sobrepostas

### O Problema Identificado:
A criação recursiva de divisores (`div > div > div`) onde um contêiner com borda contém outro contêiner com borda e, dentro dele, cada item possui sua própria caixinha com borda (`border rounded-xl` dentro de `border rounded`). Isso causa poluição visual extrema, claustrofobia de layout e perda desnecessária de espaço útil em telas de celulares.

### A Regra e Solução Padronizada:
1. **Layout Plano (Flat & Open Canvas):**
   - Eliminar caixas intermediárias decorativas. A tela ou o contêiner de seção já serve como palco visual para os elementos.
   - NUNCA colocar um elemento com `border` dentro de outro elemento que já possui `border` para agrupar o mesmo tipo de conteúdo.
2. **Apresentação de Pessoas / Equipe / Nosso Time:**
   - Dispor os membros da equipe diretamente em uma grade ou lista arejada, sem contornar cada membro com um card/borda retangular cinza.
   - A separação entre os itens é feita exclusivamente através de respiro e espaço negativo (`gap-4`, `gap-6`), e não por linhas divisórias ou paredes de caixas.
   - Apenas o rosto/foto (circular ou com borda sutil), nome e especialidade. Zero botões redundantes, zero badges de status e zero estrelas/rankings.

---

## 🎨 10. Diretriz de Contraste Obrigatório: Fundo Verde = Texto Branco & Teoria dos Opostos

### O Problema Identificado:
Uso incorreto de texto ou ícones escuros (`text-slate-950`, `text-slate-900`) sobre superfícies verdes vibrantes (`bg-emerald-500`, `bg-[#20C933]`, `bg-emerald-600`), causando perda de contraste visual, dificuldade de leitura e quebra dos princípios fundamentais de design.

### A Regra Inegociável:
1. **Fundo Verde Exige OBRIGATORIAMENTE Texto / Ícone Branco:**
   - Sempre que um componente utilizar fundo verde sólido ou com alta saturação (`bg-emerald-500`, `bg-emerald-600`, `bg-emerald-700`, `bg-[#20C933]` ou qualquer tom esmeralda/verde vivo), a tipografia e os ícones internos **DEVEM ser estritamente brancos (`text-white`)**.
   - ❌ **Proibido:** `<div className="bg-emerald-500 text-slate-950">` ou `<Check className="text-slate-950" />`
   - ✅ **Obrigatório:** `<div className="bg-emerald-500 text-white">` e `<Check className="text-white" />`
2. **Divergência e Oposição (Frio vs Quente / Claro vs Escuro):**
   - A cor do texto e a cor do fundo devem sempre divergir e pertencer a polos opostos de luminosidade e temperatura.
   - Fundo escuro e frio (`slate-950`, `slate-900`, `slate-800`) exige texto claro/branco (`text-white`, `text-slate-100`).
   - Fundo claro/quente exige texto escuro de alto contraste (`text-slate-900`).
   - Fundo com cor de destaque forte (Verde Esmeralda) exige texto branco puro (`text-white`).

---

## 🏛️ 11. Repositórios Oficiais da Tríade Vagou no GitHub

Os 3 projetos independentes da Tríade possuem repositórios versionados e soberanos:

1. **Admin VagouApp (`admvapp`):**
   - **URL:** [`https://github.com/nexuscrwd/admin.vagouapp.git`](https://github.com/nexuscrwd/admin.vagouapp.git)
   - **Domínios:** `adm.vagouapp.com` / `admin.vagouapp.com`
   - **Função:** Painel Executivo Backoffice, moderação de salões, conformidade fiscal e auditoria direta no Supabase.
2. **VagouApp Oficial / Meu Negócio (`vapp` / `mnvapp`):**
   - **URL:** [`https://github.com/nexuscrwd/vagouapp.git`](https://github.com/nexuscrwd/vagouapp.git)
   - **Domínios:** `meunegocio.vagouapp.com` / subdomínios wildcard `*.vagouapp.com`
   - **Função:** App do Estabelecimento (Gestão de Agenda, Caixa, Equipe e Vitrine Pública White-Label do Cliente).
3. **Portal VagouApp (`pvapp`):**
   - **URL:** [`https://github.com/nexuscrwd/Portal-VagouApp.git`](https://github.com/nexuscrwd/Portal-VagouApp.git)
   - **Domínios:** `portal.vagouapp.com` / `vagouapp.com`
   - **Função:** Portal do Usuário, Radar de vagas em tempo real, busca georreferenciada (GIS) e marketplace.

---

## 🧭 12. Padrão Oficial do HUD de Navegação GPS Ativa & Diagnóstico de Tiles de Mapa

### A. Anatomia do HUD de Navegação Aprovado (Padrão Oficial Tríade):
- **Cartão Superior Flutuante (`absolute top-2.5 left-2.5 right-2.5 z-20`):**
  - Bloco em `bg-slate-900/95` com `backdrop-blur-md` e borda suave.
  - Quadrado verde `bg-emerald-500` com ícone de manobra em branco puro (`text-white stroke-[2.5]`).
  - Distância e via em tipografia `Poppins` e `font-mono`.
  - Botões de cockpit `Waze` e `Maps` com respiro harmônico e bordas translúcidas.
- **Cockpit Inferior de Telemetria:**
  - Velocímetro real em `km/h` (`bottom-3 left-3`) com selo `GPS ATIVO`.
  - HUD Regressivo de distância e tempo restante (`bottom-3 right-3`) com visual glass translúcido.
  - Marcador de avatar na vertical (`0°`) com cone de visão frontal girando conforme a bússola.

### B. Arquitetura GIS Blindada (5-Layer Routing Cascade & Zero Linha Reta):
- **Proibição Absoluta de Linha Reta (`[origin, dest]`):** A polilinha do mapa (`InteractiveGoogleRouteMap.tsx`) exige sempre `> 2` pontos de geometria viária real. O rastreamento de GPS (`handleGpsFix`) jamais sobrescreve a rota com um segmento reto de 2 pontos enquanto aguarda a API ou quando o usuário se afasta da rota original (acionando recálculo assíncrono em background).
- **Ciclo de Vida Único da Instância Leaflet (`L.map`):** O mapa é inicializado uma única vez com `ResizeObserver` (`lmap.invalidateSize()`), atualizando marcadores e polilinhas imperativamente via `.setLatLng()` e `.setLatLngs()` sem destruir o DOM nem interromper o download de tiles.
- **Cascata de Roteamento Viário de 5 Camadas (`server.ts`):**
  1. Google Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`)
  2. FOSSGIS OpenStreetMap Germany OSRM (`routing.openstreetmap.de`)
  3. Project OSRM Global (`router.project-osrm.org`)
  4. Valhalla OpenStreetMap Routing Engine (`valhalla1.openstreetmap.de`, decodificando `1e6` e recodificando para `1e5`)
  5. Malha Arterial Multi-Segmentada (28 vértices interpolados em corredor urbano caso todas as redes externas estejam inacessíveis).
- **Multi-CDN Tile Fallback (`tileerror` auto-recovery):** Google Maps Tiles (`mt{0-3}.google.com`) como provedor primário, com chaveamento automático para OpenStreetMap (`tile.openstreetmap.org`) e Esri ArcGIS World Street Map (`server.arcgisonline.com`) em caso de falha de rede.

### C. Padrão de Loading Limpo (Bolinha Girando Sem Legenda) & Rótulos Sem Ambiguidade:
- **Animação de Carregamento Sem Texto:** Enquanto o endereço do `Local Atual` (GPS reverse geocode) ou cálculo de rota estiver sendo processado, exibir exclusivamente o ícone giratório `<Loader2 className="... animate-spin" />` centralizado, sem legendas redundantes como *"Carregando..."* ou *"Reconhecendo localização..."*.
- **Rótulos Diretos de Origem:** Dentro de janelas que perguntam *"De onde você vai sair?"*, utilizar botões objetivos: **`Local Atual`**, **`De Casa`** (nunca o redundante *"Saindo de Casa"*) e **`Outro Local`**.

### D. Navegação Vertical Course-Up ("Frente p/ Cima"), Map-Matching Ortogonal & Zero Costuras de Tiles:
- **Course-Up Vertical (`isCourseUp`):** O palco do Leaflet (`w-[164%] h-[164%] inset-[-32%]`) gira por `-mapBearingDeg` (azimute da via à frente), garantindo que o sentido de deslocamento aponte sempre para **CIMA (`0°` vertical)** e a avenida deslize suavemente de cima para baixo conforme o usuário avança. Fotos de avatar e badges usam `rotate(var(--map-counter-rotate, 0deg))` para permanecerem sempre em pé.
- **Estabilização Anti-Tremor & Map-Matching Ortogonal:** O evento `deviceorientation` (bússola) jamais aciona `lmap.panTo`. A posição do usuário é projetada ortogonalmente sobre o segmento viário mais próximo (`<= 55m`) e o azimute é extraído ao longo da própria polilinha da via (~45m à frente), eliminando oscilações laterais do GPS.
- **Zero Linhas/Costuras entre Tiles:** Proibido usar zoom fracionado (`16.5`) ou filtro CSS `invert()` em elementos `.leaflet-tile` individuais. Utilizar sempre zoom inteiro (`zoom: 17`, `zoomSnap: 1`) e aplicar o filtro escuro no contêiner `.vagou-map-dark .leaflet-tile-pane` inteiro.

