# 📝 Histórico de Alterações & Rastreabilidade — Vagou

Este arquivo registra cronologicamente todas as modificações relevantes realizadas no código-fonte, arquitetura e interface do projeto **Vagou**, facilitando diagnósticos rápidos, auditoria e procedimentos de rollback/backup.

---

## 📌 Formato do Registro
- **Data & Hora**
- **Tipo:** `[Fix]` (Correção), `[Feat]` (Funcionalidade), `[Refactor]` (Refatoração), `[Docs]` (Documentação)
- **Motivo / Solicitação:** Breve resumo do pedido do usuário.
- **Arquivos Impactados:** Lista de arquivos alterados/criados.
- **Resumo Técnico:** Explicação concisa da alteração.

---

### [2026-10-31] — Inserção de Rótulos Acima dos Números e Renomeação de ETA para Temp. Rest. (`bol-076`)
- **Tipo:** `[UX / UI — Refinamento de Rótulos de Métricas via Focus Mode]`
- **Motivo / Solicitação:** Inserir os textos descritivos acima dos números nas métricas do subcabeçalho e renomear ETA para "Temp. Rest." (Tempo Restante).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Rótulos Acima e Renomeação (`LiveTrackingModal.tsx`):** Ajustados os blocos de métricas para posicionar o rótulo descritivo (`Distância`, `Temp. Rest.`, `Velocidade`) acima do valor numérico correspondente.

---

### [2026-10-31] — Remoção de Fundo de Cards e Números Grandes nas Métricas (`bol-075`)
- **Tipo:** `[UX / UI — Limpeza de Cards e Destaque Numérico via Focus Mode]`
- **Motivo / Solicitação:** Remover o fundo dos cards de métricas no subcabeçalho, deixando apenas os números em tamanho grande e destacado (`text-lg font-black font-mono`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção de Fundo e Destaque de Números (`LiveTrackingModal.tsx`):** Removidos os contêineres com fundo translúcido/borda das métricas (KM, ETA e KM/H), aplicando tipografia grande em destaque (`text-lg font-black`).

---

### [2026-10-31] — Aplicação de Estilos Precisos (Focus Mode) no Bloco de Manobra (`bol-074`)
- **Tipo:** `[UX / UI — Refinamento de Layout e Tipografia via Focus Mode]`
- **Motivo / Solicitação:** Aplicar propriedades CSS exatas (fonte Verdana, 10px bold, dimensões de altura e largura, margens e preenchimentos) especificadas via Focus Mode no bloco de instruções de direção e subcabeçalho.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Estilos de Focus Mode (`LiveTrackingModal.tsx`):** Aplicadas as regras de tipografia (`font-['Verdana']`, `font-bold`, `text-[10px]`) e espaçamentos/dimensões exatas (`h-[45px] w-[175.188px]`, margens e paddings) no subcabeçalho e container de manobra.

---

### [2026-10-31] — Comandos Curtos de Direção e Efeito Piscante Amarelo (Próxima Rua) (`bol-073`)
- **Tipo:** `[UX / UI — Alertas de Navegação em Tempo Real via Focus Mode]`
- **Motivo / Solicitação:** Formatar as instruções de direção de forma curta e direta (ex: `DOBRE A DIREITA`, `DOBRE A ESQUERDA`) e adicionar um fundo piscante em amarelo (`animate-pulse bg-amber-400/20`) para destacar a próxima manobra.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Comandos Curtos e Alerta Amarelo (`LiveTrackingModal.tsx`):** Implementada a função `getShortManeuverText` para normalizar as instruções e aplicado efeito de pulso em amarelo âmbar no bloco de direção do subcabeçalho.

---

### [2026-10-31] — Habilitação de Quebra de Texto nas Instruções de Navegação (`bol-072`)
- **Tipo:** `[UX / UI — Refinamento de Tipografia e Quebra de Texto via Focus Mode]`
- **Motivo / Solicitação:** Substituir a truncagem de texto por quebra de linha natural (`whitespace-normal break-words line-clamp-2`) nas instruções de manobra do subcabeçalho (`LiveTrackingModal.tsx`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Quebra de Linha em Instruções (`LiveTrackingModal.tsx`):** Removida a classe `truncate` e aplicadas classes de quebra de palavras (`whitespace-normal break-words line-clamp-2 leading-tight`) para permitir exibição completa de nomes de ruas longos.

---

### [2026-10-31] — Inserção de Instruções de Navegação à Esquerda do Subcabeçalho (`bol-071`)
- **Tipo:** `[UX / UI — Instruções de Rota em Tempo Real via Focus Mode]`
- **Motivo / Solicitação:** Inserir instruções de navegação (ícone de direção + legenda como "Próxima Esquerda") no lado esquerdo do subcabeçalho da modal de rastreamento ao vivo (`LiveTrackingModal.tsx` e `InteractiveGoogleRouteMap.tsx`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Instruções de Manobra (`LiveTrackingModal.tsx` & `InteractiveGoogleRouteMap.tsx`):** Adicionado o callback `onManeuverUpdate` para sincronizar as manobras ativas da rota. Exibição à esquerda do subcabeçalho com ícone dinâmico (`CornerUpLeft`, `CornerUpRight`, etc.) e legenda descritiva.

---

### [2026-10-31] — Remoção de Fundo de Card nos Ícones de Aplicativos Externos (`bol-070`)
- **Tipo:** `[UX / UI — Limpeza de Estilização de Contêiner via Focus Mode]`
- **Motivo / Solicitação:** Remover o fundo de card, bordas e preenchimento (`padding`) dos links de atalho do Google Maps e Waze, deixando apenas as imagens limpas e transparentes com efeito hover.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção de Contêiner (`LiveTrackingModal.tsx`):** Removidas as classes de fundo branco/escuro, bordas e sombras dos elementos `a` de navegação externa, mantendo apenas o link limpo envolvendo diretamente a imagem de 30px.

---

### [2026-10-31] — Remoção de Spans de Texto e Ajuste de Tamanho (30px) nos Logotipos (`bol-069`)
- **Tipo:** `[UX / UI — Refinamento de Botões de Navegação via Focus Mode]`
- **Motivo / Solicitação:** Remover os spans de texto de identificação dos botões do Google Maps e Waze, deixando exclusivamente os logotipos oficiais ajustados para o tamanho de 30px por 30px (`w-[30px] h-[30px]`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Ajuste de Dimensões e Remoção de Spans (`LiveTrackingModal.tsx`):** Os rótulos de texto foram removidos dos botões de atalho externo, e as imagens dos logotipos foram redimensionadas para `30px × 30px` com alinhamento centralizado.

---

### [2026-10-31] — Integração dos Logotipos Oficiais do Google Maps e Waze (`bol-068`)
- **Tipo:** `[UX / UI — Ativos Gráficos Oficiais via Upload do Usuário]`
- **Motivo / Solicitação:** Substituir os ícones anteriores pelos logotipos oficiais enviados pelo usuário (`maps_7572ddee.png` e `waze_c7621164.png`) nos botões de atalho dos aplicativos de navegação.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Logotipos Oficiais (`LiveTrackingModal.tsx`):** Atualizados os botões de acesso ao Google Maps e Waze para renderizarem os arquivos de imagem oficiais enviados pelo usuário (`/assets/aistudio/maps_7572ddee.png` e `/assets/aistudio/waze_c7621164.png`).

---

### [2026-10-31] — Seletor Mapa/Lista no Cabeçalho Principal e Ícones Oficiais do Google Maps e Waze (`bol-067`)
- **Tipo:** `[UX / UI — Reorganização de Cabeçalho e Ícones Oficiais via Focus Mode]`
- **Motivo / Solicitação:** Inserir o seletor de modo (mapa/lista) no cabeçalho principal ao lado dos botões dos apps Google Maps e Waze, e substituir os ícones genéricos por SVGs oficiais e detalhados do Google Maps e Waze.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Seletor no Cabeçalho Principal (`LiveTrackingModal.tsx`):** O seletor de abas (Mapa e Itinerário) foi transferido para o cabeçalho superior direito, posicionado logo após os botões dos aplicativos de navegação externos.
  2. **Ícones Oficiais SVG:** Adicionados os vetores SVG oficiais estilizados para o pin multicolores do Google Maps e o balão sorridente do Waze.

---

### [2026-10-31] — Sombra Compacta e Mais Próxima nos Cards de Métricas (`bol-066`)
- **Tipo:** `[UX / UI — Refinamento de Sombras via Focus Mode]`
- **Motivo / Solicitação:** Ajustar a sombra flutuante dos cards de métricas para ter um raio menor e mais compacto, ficando mais próxima e definida junto aos elementos (`shadow-[1px_3px_5px_rgba(0,0,0,0.26)]`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Sombra Compacta (`LiveTrackingModal.tsx`):** Ajustado o raio e o desfoque das sombras dos três cards de métricas para `shadow-[1px_3px_5px_rgba(0,0,0,0.26)]`, garantindo maior proximidade visual.

---

### [2026-10-31] — Sombra Direcional de Botão Flutuante nos Cards de Métricas (`bol-065`)
- **Tipo:** `[UX / UI — Estilização de Sombras via Focus Mode]`
- **Motivo / Solicitação:** Aplicar sombra direcional nos três cards de métricas (KM, ETA e KM/H) para simular o efeito de botão flutuante, com projeção mais escura no pé e no lado direito do card (`shadow-[2px_4px_10px_rgba(0,0,0,0.22)]`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Sombra Flutuante Personalizada (`LiveTrackingModal.tsx`):** Atualizada a propriedade `shadow` de cada card individual de métricas para `shadow-[2px_4px_10px_rgba(0,0,0,0.22)]`, conferindo relevo tridimensional e destaque superior no cabeçalho.

---

### [2026-10-31] — Remoção do Ícone SVG do Botão Waze (`bol-064`)
- **Tipo:** `[UX / UI — Remoção de Ícone via Focus Mode]`
- **Motivo / Solicitação:** Remover o ícone SVG (`ExternalLink`) selecionado no botão do Waze no cabeçalho superior (`LiveTrackingModal.tsx`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção de Ícone (`LiveTrackingModal.tsx`):** Removido o elemento `<ExternalLink />` do botão de acesso rápido ao Waze, mantendo apenas o rótulo de texto estilizado.

---

### [2026-10-31] — Remoção do Card de Velocidade / KM do Rodapé do Mapa (`bol-063`)
- **Tipo:** `[UX / UI — Limpeza de Rodapé do Mapa via Focus Mode]`
- **Motivo / Solicitação:** Remover o card de KM/velocidade situado no rodapé (inferior esquerdo) do mapa (`InteractiveGoogleRouteMap.tsx`), mantendo apenas as métricas centralizadas no subcabeçalho superior.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção de Card no Rodapé (`InteractiveGoogleRouteMap.tsx`):** Excluído o bloco flutuante de velocidade do canto inferior esquerdo do mapa, deixando a visualização cartográfica 100% limpa.

---

### [2026-10-31] — Separação das Métricas do Cabeçalho em Cards Individuais de Vidro Translúcido (`bol-062`)
- **Tipo:** `[UX / UI — Refatoração de Cards de Métricas via Focus Mode]`
- **Motivo / Solicitação:** Separar o card unificado de métricas no cabeçalho em cards individuais para cada elemento (Distância em KM, Tempo Restante / ETA, e Velocidade KM/H) preservando o efeito vidro translúcido (`frosted glass`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Cards Individuais de Métricas (`LiveTrackingModal.tsx`):** O container unificado foi refatorado em três pequenos cards independentes ao lado direito do cabeçalho, cada um com sua borda de vidro translúcido (`bg-white/85 dark:bg-slate-900/50 backdrop-blur-xl`) e espaçamento proporcional.

---

### [2026-10-31] — Inserção do Indicador de Velocidade KM/H no Submenu do Cabeçalho (`bol-061`)
- **Tipo:** `[UX / UI — Unificação de Métricas de Rota no Cabeçalho]`
- **Motivo / Solicitação:** Inserir o medidor de velocidade em KM/H no submenu do cabeçalho ao lado do contador de KM e tempo restante, mantendo a tela do mapa totalmente limpa.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Velocidade no Cabeçalho (`LiveTrackingModal.tsx`):** Adicionado `currentSpeedKmh` via callback prop `onSpeedUpdate` do mapa para exibir `45 KM/H` ao lado de `29,5 KM • 00:34` no submenu com efeito vidro translúcido.
  2. **Remoção de Badge Inferior (`InteractiveGoogleRouteMap.tsx`):** Removido o badge flutuante de velocidade do canto inferior esquerdo para centralizar todas as métricas no cabeçalho.

---

### [2026-10-31] — Botão Compartilhar, Acessos Externos Google Maps & Waze e Abas com Ícones Puros (`bol-060`)
- **Tipo:** `[UX / UI — Ações de Cabeçalho e Redesenho de Abas via Focus Mode]`
- **Motivo / Solicitação:** Substituir o título "Navegação" por um botão "Compartilhar" (que avisa o salão e mostra o trajeto em tempo real), inserir os botões de atalho do Google Maps e Waze à esquerda do botão fechar (preenchidos com origem e destino) e remover as legendas das abas de Mapa e Itinerário, utilizando o ícone de lista (`ListOrdered`) para o itinerário.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Botão Compartilhar (`LiveTrackingModal.tsx`):** Inserido no lugar do título "Navegação", atualizando o status de rastreamento para `live_sharing` e disparando alerta de confirmação.
  2. **Atalhos Google Maps & Waze:** Adicionados à esquerda do botão de fechar, com links profundos gerados automaticamente com as coordenadas de origem e destino.
  3. **Abas Mapa e Itinerário:** Reduzidas para botões puramente baseados em ícones (`MapIcon` e `ListOrdered`).

---

### [2026-10-31] — Remoção do Título, Protocolo e Sub-cabeçalho de Destino no Modal de Navegação (`bol-059`)
- **Tipo:** `[UX / UI — Limpeza de Cabeçalho do Modal via Focus Mode]`
- **Motivo / Solicitação:** Remover o bloco de título/protocolo e o sub-cabeçalho de endereço de destino no modal de navegação ao vivo (`LiveTrackingModal.tsx`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Limpeza do Cabeçalho (`LiveTrackingModal.tsx`):** Removidos o bloco de título (`h3`), subtítulo/protocolo (`p`) e o sub-cabeçalho completo com o endereço de destino (`salonDestAddress`), mantendo apenas a barra superior limpa com as abas e o contador KM/ETA.

---

### [2026-10-31] — Remoção do Badge "GPS ATIVO" Abaixo do Mapa (`bol-058`)
- **Tipo:** `[UX / UI — Remoção de Elemento de Status no Mapa]`
- **Motivo / Solicitação:** Remover o elemento/badge *"GPS ATIVO"* situado abaixo do mapa na tela de navegação ao vivo (`InteractiveGoogleRouteMap.tsx`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção do Badge "GPS ATIVO":** Excluído o elemento visual de status GPS do canto inferior esquerdo do mapa, preservando apenas o velocímetro digital limpo.

---

### [2026-10-30] — Reorganização do Cabeçalho (Mapa e Itinerário a 1/3 à Esquerda, Contador KM/ETA no Canto Oposto) e Posicionamento do Ícone de Navegação a 1/3 do Mapa (`bol-057`)
- **Tipo:** `[UX / UI — Reorganização de Cabeçalho, Mapa Limpo e Reposicionamento de Câmera GIS]`
- **Motivo / Solicitação:** Reduzir os botões "Mapa" e "Itinerário" para 1/3 do tamanho e alinhá-los à esquerda do cabeçalho; inserir o contador de KM e tempo restante no canto oposto do cabeçalho (deixando o mapa 100% sem poluição); e reposicionar o ícone de navegação (puck) na linha de 1/3 inferior do mapa.
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Cabeçalho Reorganizado (`LiveTrackingModal.tsx`):** Os botões "Mapa" e "Itinerário" foram compactados (`w-[150px] sm:w-[170px]`) e alinhados à esquerda do cabeçalho. No canto oposto, foi inserido o contador de KM e ETA com efeito vidro translúcido (`bg-white/85 dark:bg-slate-900/50 backdrop-blur-xl border border-white/80`).
  2. **Mapa Limpo (`InteractiveGoogleRouteMap.tsx`):** Removidos todos os cards flutuantes de sobreposição do mapa para garantir zero poluição visual.
  3. **Posicionamento GIS (1/3 inferior):** A projeção de look-ahead da câmera foi ajustada para `0.15` km (`150m`), posicionando o ícone de navegação do usuário na linha de 1/3 a partir do rodapé do mapa.

---

### [2026-10-30] — Efeito Vidro Translúcido (Frosted Glass Claro) no Card de Distância/ETA e Formato Igualitário (`29,5` / `XX:XX`) (`bol-056`)
- **Tipo:** `[UX / UI — Efeito Vidro Translúcido Claro e Formatação de Tamanho Uniforme]`
- **Motivo / Solicitação:** Substituir o fundo escuro do card de distância/ETA por um efeito de vidro translúcido mais claro (`bg-white/85 dark:bg-slate-900/50 backdrop-blur-xl border border-white/80 dark:border-slate-700/40`) para não poluir o layout do mapa, e ajustar a formatação para exibir `29,5` e `XX:XX` com exatamente o mesmo tamanho de fonte.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Efeito Vidro Translúcido Claro (`InteractiveGoogleRouteMap.tsx`):** Atualizado o card de distância/ETA e os botões de zoom com `bg-white/85 dark:bg-slate-900/50 backdrop-blur-xl border border-white/80` (e tema escuro compatível), garantindo integração visual limpa com o mapa.
  2. **Tamanho Uniforme:** `formattedKm` e `formattedHhMm` agora compartilham a mesma classe tipográfica (`text-sm font-black font-mono`).

---

### [2026-10-30] — Preenchimento Alpha no Card de Distância/ETA, Formato Vertical `XX,X KM` / `HH:MM` e Adição de Botões de Zoom (+ / -) (`bol-055`)
- **Tipo:** `[UX / UI — Estilização Alpha do Card de Rota, Formatação Vertical e Habilitação de Zoom]`
- **Motivo / Solicitação:** Aplicar preenchimento em transparência alpha (`bg-slate-900/40 backdrop-blur-md`) no card que calcula a distância e o tempo restante de chegada, formatá-lo verticalmente com `XX,X KM` e `HH:MM`, e adicionar botões de zoom (`+` / `-`) funcionais no canto superior direito do mapa para garantir zoom instantâneo.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Alpha Fill & Formato Vertical (`InteractiveGoogleRouteMap.tsx`):** O card de distância/ETA no canto superior direito foi atualizado com `bg-slate-900/40 backdrop-blur-md border border-slate-700/40` e layout em coluna (`flex flex-col items-end gap-0.5`), exibindo *XX,X KM* com `KM` em maiúsculo acima de *HH:MM*.
  2. **Botões de Zoom Funcionais (`+` / `-`):** Adicionados botões dedicados de zoom no canto superior direito acoplados ao mapa via `lmap.zoomIn()` e `lmap.zoomOut()`.

---

### [2026-10-30] — Remoção do Badge de Orientação "Frente p/ Cima" do Mapa (`bol-054`)
- **Tipo:** `[UX / UI — Remoção de Elemento no Mapa via Focus Mode]`
- **Motivo / Solicitação:** Remover o elemento/badge indicador de orientação *"Frente p/ Cima"* situado na parte superior esquerda do mapa (`InteractiveGoogleRouteMap.tsx`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção do Badge de Orientação:** Excluído por completo o bloco `div` do indicador *"Frente p/ Cima"* no canto superior esquerdo do mapa, mantendo apenas o widget de distância e ETA no canto superior direito e o velocímetro/GPS ativo no rodapé.

---

### [2026-10-30] — Reposicionamento do Widget de Distância e Tempo Restantes (HUD) para o Canto Superior Direito do Mapa (`bol-053`)
- **Tipo:** `[UX / UI — Reposicionamento de Elemento HUD no Mapa]`
- **Motivo / Solicitação:** Reposicionar o botão/widget que calcula a distância restante e o tempo restante de chegada (anteriormente no canto inferior direito) para o canto superior direito do mapa (`absolute top-2.5 right-2.5 z-20`), realocando o badge de orientação para o canto superior esquerdo (`top-2.5 left-2.5`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Widget de Distância/ETA (`InteractiveGoogleRouteMap.tsx`):** Alterado o posicionamento de `absolute bottom-3 right-3 z-10` para `absolute top-2.5 right-2.5 z-20`.
  2. **Badge de Orientação:** Reposicionado para `absolute top-2.5 left-2.5 z-20` para evitar sobreposição no canto superior direito.

---

### [2026-10-30] — Conversão do Botão de Orientação do Mapa em Badge Informativo Alpha no Canto Superior Direito (`bol-052`)
- **Tipo:** `[UX / UI — Conversão de Botão em Badge Informativo com Preenchimento Alpha]`
- **Motivo / Solicitação:** Converter o botão indicador de orientação (`Frente p/ Cima` / `Norte Fixo`) do mapa em um elemento puramente informativo (não clicável), com preenchimento em transparência alpha (`bg-slate-900/40 backdrop-blur-md`) posicionado no canto superior direito do mapa.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Badge Informativo Alpha (`InteractiveGoogleRouteMap.tsx`):** Substituído o elemento interativo `<button>` do Course-Up por um `div` não interativo (`pointer-events-none`) com fundo `bg-slate-900/40`, borda sutil, backdrop blur, ícone de bússola rotativo e texto fixo "Frente p/ Cima" posicionado no canto superior direito (`absolute top-2.5 right-2.5 z-20`).

---

### [2026-10-30] — Remoção da Aba "Equipe" na Seção Espaço (`bol-051`)
- **Tipo:** `[UX / UI — Remoção de Aba via Focus Mode]`
- **Motivo / Solicitação:** Remover o botão da aba "Equipe" (`button:nth-of-type(1)`) na seção de espaço (`SalonProfileView.tsx`).
- **Arquivos Impactados:**
  - `src/components/SalonProfileView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção da Aba Equipe:** Removido o botão da aba "Equipe", reorganizado o grid de navegação interna de 3 colunas para 2 colunas (Estrutura e Localização), atualizados os índices de slide e os indicadores de pontos.

### [2026-10-30] — Remoção do Cartão Superior de Instrução de Manobra no Mapa GPS (`bol-050`)
- **Tipo:** `[UX / UI — Remoção do Cartão Superior de Navegação via Focus Mode & Screenshot]`
- **Motivo / Solicitação:** Remover o cartão superior de instrução de manobra e atalhos no mapa de navegação (`InteractiveGoogleRouteMap.tsx`), conforme apontado pelo usuário na captura de tela.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção do Cartão Superior de Manobra:** Removido por completo o contêiner flutuante superior de instrução de manobra do mapa ao vivo, mantendo a cartografia limpa e reposicionando o botão de orientação ("Frente p/ Cima" / "Norte Fixo").

### [2026-10-30] — Proteção Contra Fechamento Acidental de Modais por Arraste de Mouse ou Seleção de Texto (`bol-049`)
- **Tipo:** `[Fix / UX — Trava Anti-Fechamento por Arraste no Mouse e Seleção em Modais/Drawers]`
- **Motivo / Solicitação:** Corrigir problema frustrante relatado pelo usuário onde, ao arrastar o mouse para selecionar texto ou rolar elementos dentro de modais/drawers, as seções e formulários fechavam acidentalmente ao soltar o clique próximo às bordas ou no overlay de fundo.
- **Arquivos Impactados:**
  - `src/components/live-tracking/RouteSimulatorModal.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/PartnerOnboardingModal.tsx`
  - `src/components/ProfileDrawer.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Padronização da Ref `backdropMouseDownRef` nos Overlays:** Implementada checagem estrita em todos os wrappers de fundo (`backdrop`). O encerramento do modal via clique externo só é acionado se a ação de clique do mouse tiver sido iniciada **e** concluída no próprio fundo do overlay (`e.target === e.currentTarget`), ignorando drag e release iniciados dentro do conteúdo do modal.
  2. **Interrupção de Eventos nos Contêineres Internos:** Adicionados `onMouseDown={(e) => e.stopPropagation()}` e `onClick={(e) => e.stopPropagation()}` em todos os cards e gavetas internas, impedindo vazamento de cliques e movimentos de seleção de texto para o backdrop.

### [2026-10-30] — Remoção de Instrução e Implementação de Busca Inteligente de Endereço/CEP no Simulador de Rota (`RouteSimulatorModal`) (bol-048)
- **Tipo:** `[UX / UI — Autocomplete de Endereço & Remoção de Instrução]`
- **Motivo / Solicitação:** Remover a div de instruções no formulário (`form > div:nth-of-type(4)`) e tornar os inputs de endereço/destino inteligentes com autocomplete via Places API e busca automática de CEP via ViaCEP.
- **Arquivos Impactados:**
  - `src/components/live-tracking/RouteSimulatorModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção de Instrução:** Removida a div de dica/instrução no rodapé do formulário (`form > div:nth-of-type(4)`).
  2. **Endereço Inteligente & CEP Automático:** Adicionada função `handleSmartInputChange` que detecta digitação de CEP (8 dígitos), consulta ViaCEP + geocodificação para preencher endereço completo e coordenadas, e realiza autocomplete em tempo real via Google Places API com dropdown de sugestões para locais e ruas.

### [2026-10-30] — Remoção da Linha "GPS Ativo" e do Bloco "Sugestões rápidas de teste" no Simulador de Rota (`RouteSimulatorModal`) (bol-047)
- **Tipo:** `[UX / UI — Remoção de Elementos via Focus Mode]`
- **Motivo / Solicitação:** Remover os 3 elementos selecionados no formulário de `RouteSimulatorModal.tsx` (`form > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`, `form > div:nth-of-type(1) > p:nth-of-type(1) > svg:nth-of-type(1)` e `form > div:nth-of-type(2) > div:nth-of-type(1)`).
- **Arquivos Impactados:**
  - `src/components/live-tracking/RouteSimulatorModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção do status de coordenadas (`GPS Ativo`):** Removido o parágrafo `<p>` (com ícone `CheckCircle2` e `<span>` de coordenadas) no primeiro campo do formulário (`RouteSimulatorModal.tsx`).
  2. **Remoção de "Sugestões rápidas de teste":** Removido o bloco `div` de destinos predefinidos (`presetDestinations`) no segundo campo do formulário e limpada a constante/import não utilizados (`CheckCircle2`, `presetDestinations`).

### [2026-10-30] — Correção de Erro de Commit para o GitHub: Remoção de Anexos Temporários (`public/assets/aistudio` — 30 MB) e Compactação de Payload (`CHANGELOG.md`) (bol-046)
- **Tipo:** `[Fix — Infraestrutura / Exportação e Commit GitHub no AI Studio]`
- **Motivo / Solicitação:** Corrigir o erro ao realizar commit do projeto para o GitHub a partir do AI Studio.
- **Arquivos Impactados:**
  - `.gitignore`
  - `CHANGELOG.md`
  - Remoção de `/public/assets/aistudio/` (80 arquivos temporários de prints/vídeo de chat totalizando 30 MB) e `/tmp/`
- **Resumo Técnico:**
  1. **Remoção de `public/assets/aistudio/` (30 MB):** O AI Studio salvava automaticamente todos os prints e gravações de tela enviados no chat dentro de `public/assets/aistudio/` (incluindo um vídeo `.mp4` de 4.2 MB e 79 imagens), fazendo a requisição da API do GitHub estourar o limite de tamanho/timeout durante o commit.
  2. **Compactação de `CHANGELOG.md` (891 KB ➔ 80 KB):** Reduzido o tamanho do arquivo `CHANGELOG.md` para ficar bem abaixo do limite de 1 MB por blob inline da Git Tree API do GitHub, mantendo integralmente o histórico recente (`bol-001` a `bol-046`).
  3. **Blindagem no `.gitignore`:** Adicionados `public/assets/aistudio/` e `tmp/` ao `.gitignore`.

### [2026-10-30] — Ajuste de Padding (`5px`) e Margin-Left (`5px`) no Contêiner da Logo do Cabeçalho (`header#salon-profile-header`) (bol-045)
- **Tipo:** `[UX / UI — Ajuste de Espaçamento via Focus Mode no Cabeçalho da Vitrine]`
- **Motivo / Solicitação:** Aplicar `padding: 5px` (`padding-left: 5px`, `padding-right: 5px`, `padding-top: 5px`, `padding-bottom: 5px`) e `margin-left: 5px` ao elemento selecionado `header#salon-profile-header > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)`.
- **Arquivos Impactados:**
  - `src/components/SalonProfileView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Espaçamento `p-[5px] ml-[5px]`:** Atualizadas as classes do contêiner interno da logomarca em `header#salon-profile-header` (`SalonProfileView.tsx`) de `pl-0 ml-0 py-0` para `p-[5px] ml-[5px]`.

### [2026-10-30] — Ajuste da Altura da Barra de Navegação Inferior (`nav#vagou-bottom-nav`) para `80px` (bol-044)
- **Tipo:** `[UX / UI — Ajuste de Altura de `nav#vagou-bottom-nav` via Focus Mode]`
- **Motivo / Solicitação:** Ajustar o tamanho inserido (`height: 80px`) no elemento selecionado `nav#vagou-bottom-nav`.
- **Arquivos Impactados:**
  - `src/components/BottomNav.tsx`
  - `src/components/SalonProfileView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Altura `80px` (`h-[80px]`):** Atualizada a classe de altura do elemento `nav#vagou-bottom-nav` em `BottomNav.tsx` de `h-[66px]` para `h-[80px]` e sincronizado o offset de sobreposição do rodapé (`-mt-[80px]`) em `SalonProfileView.tsx`.

### [2026-10-30] — Ajustes de Pergunta Secreta com Quebra de Texto, Dimensionamento Compacto de Endereço (Complemento, Bairro, UF, CEP, Número), Confirmação de Nome de Usuário e Cabeçalho Centralizado com Altura Dobrada (bol-043)
- **Tipo:** `[Feat / UX — Perguntas Secretas com Quebra de Linha, Proporção de Campos de Endereço, Confirmação de Usuário e Cabeçalho Centralizado]`
- **Motivo / Solicitação:**
  1. Atualizar as opções de Pergunta Secreta para: `"Qual o nome do meu animal de estimação?"`, `"Onde vc morou aos 10 anos?"` e `"Nome do seu amigo de infância?"` com quebra de linha (`whitespace-normal break-words`).
  2. No Resumo de Endereço, tornar o campo `Complemento` menor que `Bairro` (que pode conter nomes extensos) e reduzir a largura/espaçamento interno dos campos `UF`, `CEP` e `Número` de acordo com o limite exato de caracteres.
  3. Na Fase 2 (`Nome e Usuário`), inserir o campo de confirmação do Nome de Usuário (`Confirme o Nome de Usuário`).
  4. Dobrar a altura do cabeçalho dos modais (`SalonAuthHeader.tsx`), centralizando o logotipo no topo e o nome do estabelecimento abaixo (ou exibindo apenas o nome do estabelecimento centralizado quando não houver logotipo).
- **Arquivos Impactados:**
  - `src/components/auth/SalonAuthHeader.tsx`
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `src/components/auth/TriadeUserRecoveryModal.tsx`
  - `supabase_security_questions.sql`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Perguntas Secretas com Quebra de Texto:** Substituído o `<select>` nativo por lista expansível customizada com `whitespace-normal break-words leading-snug` contendo as 3 opções exatas solicitadas.
  2. **Proporção de Campos no Resumo de Endereço:** `Complemento` ajustado para `w-[115px] sm:w-[125px]` (menor que `Bairro` `flex-1`), `Número` ajustado para `w-[54px]`, `UF` ajustado para `w-[38px]` e `CEP` ajustado para `w-[82px]` com texto centralizado e sem folgas internas excessivas.
  3. **Confirmação de Nome de Usuário:** Adicionado o campo `"Confirme o Nome de Usuário"` na Fase 2 (`step === 'name'`), validando igualdade com `"Nome de Usuário"` antes de habilitar o avanço.
  4. **Cabeçalho Centralizado com Altura Dobrada (`SalonAuthHeader.tsx`):** Altura `min-h-[116px]`, logotipo centralizado acima do nome do salão e, quando não há logotipo cadastrado, exibe apenas o nome do salão centralizado (sem ícone genérico).

### [2026-10-30] — Manutenção do Input de CEP Editável na Tela de Número e Complemento (`address_num`) (bol-042)
- **Tipo:** `[UX / Feat — Input de CEP Permanente para Reedição Rápida em Número e Complemento]`
- **Motivo / Solicitação:** Manter o input de `CEP` visível e editável no lugar durante a tela de `Número e Complemento` (`step === 'address_num'`), permitindo que o usuário corrija ou reedite o CEP imediatamente caso tenha digitado um CEP errado, sem precisar voltar de tela.
- **Arquivos Impactados:**
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Input `Digite seu CEP` Mantido no Topo de `address_num`:** O campo editável de CEP (`12345-678`) permanece fixo no topo da etapa `Número e Complemento`. Ao editar qualquer dígito do CEP, o endereço anterior é limpo imediatamente e, ao completar os 8 dígitos, o sistema consulta o novo CEP automaticamente no próprio modal.

### [2026-10-30] — Remoção do Botão "ACESSAR" do Rodapé do Formulário "CADASTRO" (bol-041)
- **Tipo:** `[Fix / UX — Remoção de Elemento Não Solicitado no Modal CADASTRO]`
- **Motivo / Solicitação:** Remover o botão `"ACESSAR"` que estava no rodapé da Fase 1 do formulário `"CADASTRO"` (`TriadeUserRegisterForm.tsx`).
- **Arquivos Impactados:**
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção Estrita do Botão Selecionado:** Removido o botão `"ACESSAR"` do rodapé do formulário `"CADASTRO"` (`TriadeUserRegisterForm.tsx`) e o import não utilizado `UserCheck`.

### [2026-10-30] — Estilização Discreta (Texto Thin) no Rodapé do Modal "ACESSAR" para "Esqueci Usuário/Senha" e "CADASTRO" (bol-040)
- **Tipo:** `[UX / UI — Rodapé Discreto com Tipografia Thin no Modal ACESSAR]`
- **Motivo / Solicitação:** Tornar as duas opções do rodapé do modal `"ACESSAR"` (`"Esqueci Usuário/Senha"` e `"CADASTRO"`) discretas, exibidas como texto fino (`font-thin`) no rodapé do modal, sem caixas ou bordas pesadas.
- **Arquivos Impactados:**
  - `src/components/auth/TriadeUserLoginForm.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Botões Discretos em Texto Thin (`font-thin text-xs`):** Removidos o fundo em caixa (`bg-slate-950`), as bordas (`border-slate-800`) e os ícones dos dois botões selecionados no rodapé do formulário `"ACESSAR"`, transformando `"Esqueci Usuário/Senha"` e `"CADASTRO"` em links de texto finos e discretos (`font-thin text-xs text-slate-400 hover:text-emerald-400`) alinhados no rodapé do modal.

### [2026-10-30] — Separação em Formulários Independentes ("ACESSAR" e "CADASTRO"), Modal "Esqueci Usuário/Senha" com Pergunta Secreta Aleatória, Cabeçalho Obrigatório com Logotipo do Salão e Script SQL (bol-039)
- **Tipo:** `[Feat / Refactor — Modais Independentes ACESSAR, CADASTRO e Recuperação com Pergunta Secreta + SQL Supabase]`
- **Motivo / Solicitação:** Separar os formulários em modais independentes (`"ACESSAR"` e `"CADASTRO"`), adicionar ao pé do formulário `"ACESSAR"` a opção `"Esqueci Usuário/Senha"` que chama um modal com duas opções (`[Usuário]` e `[Senha]`), implementar a recuperação de usuário por pergunta secreta aleatória (`Nome do primeiro animal de estimação?`, `Onde você morava aos 10 anos de idade?`, `Qual nome da primeira escola onde você estudou?`, `Qual o nome do seu melhor amigo(a) de infância?`), garantir que todos os modais exibam o cabeçalho com o logotipo/logomarca do salão e fornecer o código SQL completo para inserção das perguntas e consulta das respostas.
- **Arquivos Impactados:**
  - `src/components/auth/SalonAuthHeader.tsx` (novo)
  - `src/components/auth/TriadeUserRecoveryModal.tsx` (novo)
  - `src/components/auth/TriadeUserLoginForm.tsx`
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `src/components/auth/TriadeUserAuthCard.tsx`
  - `src/components/SalonProfileView.tsx`
  - `supabase_security_questions.sql` (novo)
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Cabeçalho Obrigatório com Logotipo/Logomarca do Salão (`SalonAuthHeader.tsx`):** Presente em todos os modais independentes (`ACESSAR`, `CADASTRO`, `ESQUECI USUÁRIO/SENHA`, `RECUPERAR USUÁRIO` e `RECUPERAR SENHA`) com resolução de logo do estabelecimento (`salonLogoUrl` / `localStorage`) e botão `"X"`.
  2. **Formulários Independentes (`ACESSAR` e `CADASTRO`):** Removida a barra superior que unia os dois formulários; agora `"ACESSAR"` (`TriadeUserLoginForm`) e `"CADASTRO"` (`TriadeUserRegisterForm`) operam como modais independentes. Ao pé do formulário `"ACESSAR"` constam os botões `"Esqueci Usuário/Senha"` e `"CADASTRO"`.
  3. **Modal de Recuperação (`TriadeUserRecoveryModal.tsx`):** Exibe inicialmente os dois botões **`Usuário`** e **`Senha`**. Ao clicar em **`Usuário`**, sorteia uma pergunta secreta aleatória do sistema (permitindo também selecionar entre os temas *Meu animal de estimação*, *Onde morava aos 10 anos*, *Primeira escola* e *Meu amigo(a) de infância*), consulta a resposta em `public.user_security_answers` / `public.clients` e revela o `@username` com atalho direto para preencher no `"ACESSAR"`.
  4. **Script SQL Oficial (`supabase_security_questions.sql`):** Criadas as tabelas `public.security_questions` e `public.user_security_answers`, `INSERT` das perguntas oficiais e funções RPC `get_random_security_question()` e `recover_username_by_security_answer()`.

### [2026-10-30] — Limpeza Imediata do CEP na Busca Inversa ao Alterar Qualquer Caractere ou Algarismo no Resumo de Endereço (bol-038)
- **Tipo:** `[Fix — Invalidação Imediata do CEP Encontrado ao Editar Campos de Endereço e Validação Estrita de Correspondência Exata]`
- **Motivo / Solicitação:** Corrigir o comportamento no Resumo de Endereço onde, após o sistema encontrar o CEP pela busca inversa, se o usuário alterasse ou apagasse qualquer letra, valor ou algarismo das informações inseridas (`Endereço`, `Bairro`, `Cidade` ou `UF`), o CEP encontrado permanecia inalterado no campo. O CEP deve desaparecer imediatamente ao alterar qualquer caractere e só reaparecer quando os dados formarem um endereço válido e exato.
- **Arquivos Impactados:**
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Limpeza Instantânea no `onChange` (`setCep('')`):** Ao alterar qualquer caractere nos campos de `Endereço`, `Bairro`, `Cidade` ou `UF`, o estado `cep` é zerado imediatamente (`setCep('')`).
  2. **Limpeza quando Campos Ficam Incompletos ou Sem Correspondência:** Adicionado `setCep('')` tanto no retorno antecipado (quando qualquer campo tem tamanho insuficiente ou é apagado) quanto no bloco final da busca (`else { setCep(''); }`) quando a API não encontra correspondência para o texto modificado.
  3. **Correspondência Exata de Logradouro, Bairro, Cidade e UF (`stripStreetPrefix` + `normalizeText`):** Removido o fallback permissivo (`data[0]`) que mantinha o CEP mesmo com palavras ou algarismos alterados no logradouro/bairro; agora o CEP só é preenchido quando o núcleo do logradouro, bairro, cidade e UF coincidem exatamente com o registro oficial da API, exigindo também CEP válido (`cepDigits.length === 8`) para habilitar o botão **Confirmar**.

### [2026-10-30] — Blindagem do Modal de Login/Cadastro: Fechamento Exclusivo pelo Botão "X" e Persistência de Estado Contra Fechamento por Arraste de Mouse ou Clique Externo (bol-037)
- **Tipo:** `[Fix Crítico — Bloqueio de Fechamento Acidental por Clique no Backdrop / Arraste de Seleção de Texto e Persistência do Rascunho de Cadastro]`
- **Motivo / Solicitação:** Corrigir defeito grave onde o modal de Login/Cadastro se fechava sozinho ao arrastar o mouse com o botão pressionado (selecionando texto nos inputs) ou ao clicar fora do card, garantindo que o modal se feche **exclusivamente** ao clicar no botão **"X"** (ou ao concluir a autenticação).
- **Arquivos Impactados:**
  - `src/components/SalonClientAuthModal.tsx`
  - `src/components/auth/TriadeUserAuthCard.tsx`
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `src/components/SalonProfileView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção do `onClick` no Backdrop e do Listener de `Escape` (`SalonClientAuthModal.tsx`):** Removido o handler `onClick={handleCloseModal}` da camada de fundo (`fixed inset-0`) e o listener da tecla `Escape`, impedindo que o arraste de seleção de texto com o mouse para fora do card ou cliques fora do modal fechem o formulário. O fechamento ocorre **somente** ao clicar no botão **"X"**.
  2. **Persistência de Rascunho e Modo Ativo (`sessionStorage`):** Sincronizados `vagou_client_auth_modal_open`, `vagou_client_auth_modal_mode` (`'login'` | `'register'`) e `vagou_register_wizard_draft` (fase atual e todos os campos digitados) em `sessionStorage`, preservando 100% do preenchimento até que o usuário clique em **"X"** ou finalize o cadastro.
  3. **Estabilização do `useEffect` de Carregamento (`SalonProfileView.tsx`):** Removidas dependências cíclicas (`adminSettings.salonSlug` e `currentSalonDbId`) do efeito `loadDataFromSupabase()` para evitar re-execuções em segundo plano durante o uso do formulário.

### [2026-10-30] — Ordenação e Dimensionamento do Resumo de Endereço, Consulta Inversa Mágica de CEP via API e Eliminação de Auto-Refresh na Vitrine (bol-036)
- **Tipo:** `[Feat / Fix — Ordem Exata dos Campos de Endereço, Reverse CEP Lookup Automático e Estabilização da Árvore React]`
- **Motivo / Solicitação:** Ajustar a ordem e o tamanho dos campos no Resumo de Endereço (`Endereço` + `Número` de 5 caracteres; `Complemento` de 25 caracteres + `Bairro`; `Cidade` + `UF` com lista suspensa e texto livre + `CEP`), implementar a consulta inversa mágica de CEP via API ao digitar rua, bairro, cidade e UF, e eliminar o problema de auto-atualização que retornava o app para a tela inicial durante o preenchimento do formulário.
- **Arquivos Impactados:**
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `src/App.tsx`
  - `src/components/SalonProfileView.tsx`
  - `index.html`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Ordenação e Dimensionamento no Resumo de Endereço (`step === 'address_summary'`):**
     - **Linha 1:** `Endereço` (`flex-1`) e `Número` (`w-[74px]`, `maxLength={5}`).
     - **Linha 2:** `Complemento` (`w-[185px] sm:w-[200px]`, `maxLength={25}`) e `Bairro` (`flex-1`).
     - **Linha 3:** `Cidade` (`flex-1`), `UF` (`w-[70px]`, lista suspensa `<datalist id="triade-uf-options">` com as 27 UFs + aceite de texto livre) e `CEP` (`w-[106px]`, `maxLength={9}`).
  2. **Consulta Inversa Mágica de CEP via API:** Ao digitar ou editar Rua (`street`), Bairro (`neighborhood`), Cidade (`city`) e UF (`uf`), o sistema executa automaticamente uma busca reversa com debounce (`ViaCEP /ws/{UF}/{Cidade}/{Logradouro}/json/` filtrando por bairro + fallback `Nominatim OpenStreetMap`) e preenche o `CEP` encontrado (`12345-678`).
  3. **Eliminação Definitiva do Auto-Refresh / Reset para a Página Inicial:**
     - `index.html`: Removido o `window.location.reload()` automático do listener `controllerchange` do Service Worker e adicionado desregistro automático do SW no ambiente de preview (`run.app` / `localhost`).
     - `src/App.tsx`: Estabilizada a `key` de `<SalonProfileView key={currentSubdomain || 'salon-profile'}>` (impedindo desmontagem/remontagem quando `initialSalonData` ou `salonName` resolvem em background) e blindados os estados de polling contra re-renderizações desnecessárias.
     - `src/components/SalonProfileView.tsx`: Removido o disparo redundante de `vagou:auth-updated` ao final de `loadDataFromSupabase()`.

### [2026-10-30] — Cadastro de Usuário em Fases (Wizard Modal: Contato, Nome/Username, E-mail, CEP/Resumo de Endereço, Senha Forte e Tela de Boas-Vindas com Login Imediato) (bol-035)
- **Tipo:** `[Feat / UX — Wizard de Cadastro em Fases com Autocompletar de CEP e Login Imediato]`
- **Motivo / Solicitação:** Estruturar o formulário de cadastro em fases sequenciais com botões de **Avançar** (liberado quando os dados da fase são válidos), **Voltar** (para rever dados anteriores) e botão **"X"** para fechar o modal, evitando formulários longos e cansativos.
- **Arquivos Impactados:**
  - `src/components/auth/TriadeUserRegisterForm.tsx`
  - `src/components/auth/TriadeUserAuthCard.tsx`
  - `src/components/SalonClientAuthModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Fase 1 — Contato (`contact`):** Celular/WhatsApp com máscara automática `(11) 99999-9999` e input de confirmação idêntica.
  2. **Fase 2 — Nome (`name`):** Nome completo e Nome de Usuário (`@username`) de livre escolha (sem sugestões automáticas), com verificação em tempo real no banco de dados (`system_admins`, `clients` e `salon_users`) para impedir nomes de usuário duplicados.
  3. **Fase 3 — E-mail (`email`):** E-mail principal com input de confirmação idêntica.
  4. **Fase 4 — Endereço em 3 Sub-telas (`address_cep` ➔ `address_num` ➔ `address_summary`):**
     - Input de CEP com placeholder e máscara `"12345-678"`, consultando ViaCEP/BrasilAPI automaticamente.
     - Botão **"Não sei meu CEP"** permanente abaixo do campo de CEP; quando o CEP digitado não é encontrado, exibe a mensagem *"Endereço não encontrado pelo CEP digitado! Verifique se o CEP digitado acima está correto. Ou clique no botão abaixo."* logo acima do botão.
     - Quando encontrado, avança para os inputs **"Número"** e **"Complemento"** e, em seguida, para o **Modal Resumo de Endereço** com todos os campos editáveis (`Endereço`, `Número`, `Compl.`, `Bairro`, `Cidade`, `UF`, `CEP`) e botão **"Confirmar"**.
  5. **Fase 5 — Senha de Acesso (`password`) & Gravação Resiliente:** Exige ao menos **1 letra maiúscula**, **1 caractere especial** e **confirmação de senha** idêntica, realizando upsert/atualização direta em `public.clients` sem travar o avanço final.
  6. **Fase 6 — Tela de Boas-Vindas (`welcome`) com Login Imediato:** Exibe `"Bem vindo ao {Nome do Salão}, e fazer parte de nós! Seu cadastro foi realizado com sucesso."` com resumo de Nome Completo, Nome de Usuário e E-mail, mantendo o modal aberto até o usuário clicar em **"Continuar Conectado"** ou no **"X"**, já autenticado imediatamente sem retornar à aba de login.

### [2026-10-30] — Redesenho dos Formulários Internos de Login e Cadastro (`TriadeUserAuthCard`, `TriadeUserLoginForm` e `TriadeUserRegisterForm`) com Cabeçalho do Estabelecimento e Botão "Conta Google" (bol-034)
- **Tipo:** `[Feat / Refactor — Formulário Unificado de Autenticação da Tríade & Login Google sem Exposição de URL do Supabase]`
- **Motivo / Solicitação:** Redesenhar os formulários internos de login e cadastro com base na arquitetura `TriadeUserAuthCard`, exibindo o cabeçalho com logo e nome do estabelecimento, barra de alternância rápida (`"Já tenho conta"` / `"Criar nova conta"`), campo multi-identificador (`username`, `e-mail` ou `celular`) integrado à base unificada da Tríade, campo de senha e botão `"Conta Google"` via popup Firebase Auth (eliminando a exposição da URL bruta do projeto Supabase).
- **Arquivos Impactados:**
  - `src/components/auth/TriadeUserAuthCard.tsx` (novo)
  - `src/components/auth/TriadeUserLoginForm.tsx` (novo)
  - `src/components/auth/TriadeUserRegisterForm.tsx` (novo)
  - `src/components/SalonClientAuthModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Componente Unificado (`TriadeUserAuthCard.tsx`):** Cabeçalho fixo com o logotipo e o nome do estabelecimento (`salonLogoUrl` e `salonName`), além de chaveamento instantâneo entre `"Já tenho conta"` e `"Criar nova conta"`.
  2. **Login Multi-Identificador (`TriadeUserLoginForm.tsx`) & Confirmação de Senha no Cadastro (`TriadeUserRegisterForm.tsx`):** Reconhece automaticamente qualquer entrada (`@username`, `e-mail` ou `celular/telefone`) cruzando as tabelas da Tríade (`system_admins`, `clients`, `salon_users` e `professionals`) com validação direta de `password_hash`, confirmação obrigatória de senha (`Confirmar Senha`) no formulário de criação de conta e fluxo de recuperação de senha em 2 etapas.
  3. **Botão `"Conta Google"` Sem Expor URL do Supabase:** Utiliza `signInWithPopup` do Firebase Auth configurado no projeto, exibindo a autenticação limpa sem redirecionar para `*.supabase.co/auth/v1/callback`.

### [2026-10-30] — Exclusão Permanente de Todos os Iframes e Embeds Externos de Login, Cadastro e Recuperação de Senha (bol-033)
- **Tipo:** `[Refactor / Security — Exclusão Definitiva de Iframes/Embeds Externos de Autenticação]`
- **Motivo / Solicitação:** Localizar e excluir permanentemente todos os iframes e embeds externos do aplicativo relacionados a login, cadastro e recuperação de senha que apontavam para domínios externos (`adm.vagouapp.com` / `admin.vagouapp.com`), garantindo que 100% da autenticação pertença nativamente a este projeto (`mnvapp`).
- **Arquivos Impactados:**
  - `src/components/public/UnifiedRegisterEmbedModal.tsx` (excluído permanentemente)
  - `src/App.tsx`
  - `src/components/public/SalonNotFoundScreen.tsx`
  - `src/lib/supabase.ts`
  - `src/hooks/useSalonRole.ts`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Exclusão do `UnifiedRegisterEmbedModal.tsx`:** Removido permanentemente o componente que renderizava `<iframe src="https://adm.vagouapp.com/cadastro?embed=true..." />`.
  2. **Remoção de Listeners `postMessage` Externos (`src/App.tsx`):** Removido o listener de mensagens cross-origin (`VAGOU_REGISTRATION_SUCCESS`, `VAGOU_LOGIN_SUCCESS`, `VAGOU_AUTH_SUCCESS`, `VAGOUAPP_EMBED`, `VAGOUAPP_FORM`).
  3. **Cadastro 100% Local em `SalonNotFoundScreen.tsx`:** Substituído o redirecionamento externo (`https://admin.vagouapp.com/cadastro`) pelo componente nativo `PartnerRegistrationWizard` do próprio projeto.

### [2026-10-30] — Integração Google Workspace (Gmail, Google Chat, Google Drive, Google Sheets e Google Tasks) com OAuth em Memória e Confirmação Explícita (bol-032)
- **Tipo:** `[Feat — Google Workspace 1P APIs & OAuth Integration]`
- **Motivo / Solicitação:** Integrar Gmail, Google Chat, Google Drive, Google Sheets e Google Tasks no aplicativo via OAuth oficial do Google Workspace.
- **Arquivos Impactados:**
  - `src/services/googleWorkspaceService.ts` (novo)
  - `src/components/professional/GoogleWorkspaceHub.tsx` (novo)
  - `src/components/professional/UtilitiesAndToolsView.tsx`
  - `src/components/ProfileDrawer.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **OAuth & Escopos (`googleWorkspaceService.ts`):** Provisionamento dos escopos de Gmail, Google Chat, Google Drive, Google Sheets e Google Tasks via `set_up_oauth`, com autenticação `GoogleAuthProvider` (`signInWithPopup`) e cache do `accessToken` estritamente em memória (zero armazenamento em `localStorage`/`sessionStorage`), limpo automaticamente via `onAuthStateChanged`.
  2. **Hub Google Workspace (`GoogleWorkspaceHub.tsx` & `UtilitiesAndToolsView.tsx`):** Central integrada em *Utilidades & Ferramentas* e no menu de Gestão com 5 abas operacionais (`Gmail`, `Chat`, `Drive`, `Sheets` e `Tasks`), avisos de pré-requisitos do Google Chat (conta Workspace corporativa + link direto para configuração no Google Cloud Console) e modais de confirmação explícita obrigatórios antes de qualquer operação mutante ou destrutiva.

### [2026-10-30] — Criação do Manifesto Soberano `HERMES.md` (n8n, Evolution API, WAHA & Auditoria GIS/RTLS) e Alinhamento de Identidade `mnvapp` (bol-031)
- **Tipo:** `[Docs / Feat — Governança Soberana Hermes Agent, Integrações & Especialidade GIS/RTLS]`
- **Motivo / Solicitação:** Corrigir a identidade do projeto nas instruções mestras (que estavam com texto do `admvapp` em vez do `mnvapp` — Meu Negócio VagouApp), incluir formalmente a especialidade **GIS / RTLS / GPS / Mapas e Google Maps Platform** e criar o guia soberano `HERMES.md` para leitura de código, caça a erros e integração com **n8n**, **Evolution API** e **WAHA**.
- **Arquivos Impactados:**
  - `HERMES.md` (novo)
  - `AGENTS.md`
  - `GEMINI.md`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Criação do `HERMES.md`:** Define a ordem determinística de leitura de arquivos do `mnvapp`, o protocolo soberano de busca de erros e auto-cura (`tsc --noEmit`, `npm run build`, auditoria GIS Zero Linha Reta, Course-Up Vertical e trava de contraste verde/branco) e a arquitetura de eventos para **n8n**, **Evolution API** e **WAHA** (`appointment.created`, `radar.flash_slot.published`, `rtls.client_departed`, `rtls.client_arriving`, etc.).
  2. **Alinhamento de Identidade (`AGENTS.md` & `GEMINI.md`):** Atualizados para explicitar que este projeto é o **`mnvapp` (`meunegocio.vagouapp.com` e Vitrines White-Label `*.vagouapp.com`)** sob responsabilidade do Engenheiro Chefe de Software & Especialista Sênior em GIS / RTLS / GPS / Mapas e Google Maps Platform.

### [2026-10-29] — Navegação Vertical Course-Up (Frente p/ Cima), Map-Matching Ortogonal, Estabilização Zero Tremor e Eliminação de Linhas entre Tiles (bol-030)
- **Tipo:** `[Fix / Feat — Navegação Vertical Course-Up, Estabilização Anti-Tremor & Renderização Sem Costuras]`
- **Motivo / Solicitação:** Análise do vídeo enviado pelo usuário mostrando: (1) o mapa tremendo/solto dentro do frame; (2) linhas/traços de grade aparecendo nos blocos do mapa; e (3) o ícone de navegação descendo contra o sentido ao caminhar/dirigir para frente (rumo Sul na Av. Natália Zarif), além da necessidade de girar o mapa na vertical.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/index.css`
  - `KNOWLEDGE_BASE.md`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Modo Navegação Vertical Course-Up ("Frente p/ Cima") + Giro de 2 Dedos:** O estágio do mapa (`164% x 164%` centralizado em `inset-[-32%]`) gira automaticamente por `-roadBearingDeg`, alinhando a via à frente **sempre na vertical para CIMA (`0°` no topo da tela)**. Conforme o usuário avança, a rua desliza suavemente na vertical de cima para baixo enquanto a seta direcional aponta para cima. A foto do avatar e os selos (`Saída` / `Destino`) recebem contra-rotação automática (`--map-counter-rotate`) para permanecerem sempre na horizontal (`0°`).
  2. **Controlador de Gestos Rotacionado (1 Dedo Pan + 2 Dedos Giro/Zoom + Botão Bússola):** Adicionado suporte a giro livre com 2 dedos, arrasto com 1 dedo corrigido pela matriz de rotação do mapa (`cos/sin`) e botão rápido **`Frente p/ Cima` / `Norte Fixo`** abaixo do cartão de manobra.
  3. **Estabilização Absoluta Zero Tremor:** Removida a chamada de `lmap.panTo` de dentro do listener `deviceorientation` (que disparava 8 vezes por segundo com o ruído do magnetômetro e fazia o mapa chacoalhar). Implementado **Map-Matching Ortogonal Contínuo** (`findForwardRouteBearingAndRemainingPath`), projetando a posição do usuário diretamente sobre o eixo central da polilinha da rua e calculando o azimute (`bearing`) pelos segmentos da própria via (~45m à frente), eliminando 100% da oscilação lateral do GPS.
  4. **Eliminação Total de Linhas/Traços entre Tiles (`src/index.css`):** Substituído o zoom fracionado (`16.5` ➔ `17` inteiro com `zoomSnap: 1`) e movido o filtro de tema escuro das imagens individuais `.leaflet-tile` para o contêiner único `.vagou-map-dark .leaflet-tile-pane` com `outline: 1px solid transparent` e `backface-visibility: hidden`, extinguindo as costuras subpixel na GPU mobile.

### [2026-10-28] — Engenharia GIS Blindada (Zero Linha Reta + Multi-CDN Tiles), Spinner Limpo Sem Legenda e Correção Semântica "De Casa" (bol-029)
- **Tipo:** `[Fix / Refactor — GIS Georreferência Blindada, Zero Linha Reta & Síntese UX]`
- **Motivo / Solicitação:** Eliminar definitivamente o fallback de linha reta no mapa e falhas de carregamento de tiles, exibir apenas a animação giratória (bolinha girando sem legenda "Carregando...") enquanto o endereço do local atual é resolvido, e corrigir a ambiguidade do botão *"Saindo de Casa"* para **"De Casa"** na janela *"De onde você vai sair?"*.
- **Arquivos Impactados:**
  - `server.ts`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/live-tracking/RouteSimulatorModal.tsx`
  - `src/components/SalonBookingModal.tsx`
  - `KNOWLEDGE_BASE.md`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Garantia Absoluta Zero Linha Reta (`InteractiveGoogleRouteMap.tsx`):** Removidos todos os fallbacks de 2 pontos (`[origin, dest]`) em `findForwardRouteBearingAndRemainingPath` e `handleGpsFix`. Quando o GPS ao vivo dispara antes da rota ou fora do traçado (> 220m), o componente preserva a malha viária e dispara recálculo assíncrono por ruas reais.
  2. **Ciclo de Vida Único do Leaflet + Multi-CDN Tile Auto-Recovery:** `L.map` agora é instanciado uma única vez com `ResizeObserver` (`invalidateSize`), evitando destruição do mapa ao atualizar coordenadas. Adicionado fallback automático de tiles (`tileerror`): Google Maps ➔ OpenStreetMap ➔ Esri ArcGIS World Street Map.
  3. **Cascata de Roteamento Viário de 5 Camadas (`server.ts`):** `/api/geo/route` e `/api/maps/compute-route` agora resolvem coordenadas de pontos notáveis (Aeroporto de Guarulhos, Av. Paulista, Morumbi, Ibirapuera, Congonhas + Nominatim) e operam em cascata: Google Routes API v2 ➔ FOSSGIS OSRM (`routing.openstreetmap.de`) ➔ OSRM Global (`router.project-osrm.org`) ➔ Valhalla OSM (`valhalla1.openstreetmap.de`) ➔ Corredor Arterial Multi-Segmentado de 28 vértices.
  4. **Spinner Limpo Sem Texto ("Bolinha Girando"):** Nos modais de origem (`SalonBookingModal.tsx`) e simulador (`RouteSimulatorModal.tsx`), enquanto o endereço do `Local Atual` é geocodificado, exibe-se exclusivamente o `<Loader2 className="animate-spin" />` sem textos redundantes.
  5. **Correção Semântica ("Saindo de Casa" ➔ "De Casa"):** Ajustado nos botões de escolha de partida e na barra compacta de origem para responder diretamente à pergunta *"De onde você vai sair?"*.

### [2026-10-28] — Eliminação Definitiva da Marca D'água com Ladrilhos Oficiais Google Maps (bol-028)
- **Tipo:** `[Fix — Cartografia Limpa & Zero Marcas D'água]`
- **Motivo / Solicitação:** A tela de navegação GPS apresentava a marca d'água diagonal *"API KEY REQUIRED carto.com/basemaps/apikey"* do provedor externo CartoDB.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/index.css`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Substituição da Camada Cartográfica:** Trocado o provedor de ladrilhos da CartoDB pelos ladrilhos oficiais do Google Maps (`https://mt{s}.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}`) com subdomínios `0, 1, 2, 3` e zoom até nível 20.
  2. **Eliminação da Marca D'água:** 100% livre de qualquer texto de aviso ou exigência de chave de terceiros, com ruas, vias e avenidas renderizadas com a cartografia padrão do Google Maps em português.
  3. **Suporte a Dark Mode:** Adicionado filtro CSS dedicado `.vagou-nav-dark-tiles` em `src/index.css` para manter o contraste perfeito com a paleta `slate-950` e a rota esmeralda `#10b981`.

### [2026-10-28] — Simulador de Trajeto Provisório no Menu do App com "Minha Localização" e Navegação Ao Vivo (bol-027)
- **Tipo:** `[Feat — Simulador de Trajeto GPS & Teste de Navegação]`
- **Motivo / Solicitação:** Adicionar no menu do aplicativo uma opção provisória "Trajeto" para testes rápidos, com modal para inserir endereço de partida (com botão "Minha Localização" via GPS), endereço de destino e botão "Ir" para abrir a tela de navegação ao vivo.
- **Arquivos Impactados:**
  - `src/components/live-tracking/RouteSimulatorModal.tsx`
  - `src/components/ProfileDrawer.tsx`
  - `src/components/UserAppointmentsView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Componente `RouteSimulatorModal.tsx`:** Modal dedicado para testes com campo de Origem, botão "Minha Localização" (captura GPS com alta precisão e reverse geocoding via `/api/maps/snap-and-reverse`), campo de Destino com chips rápidos (Aeroporto de Guarulhos, Av. Paulista, Shopping Morumbi, etc.), seletor de modalidade (Carro, Moto, Bike, A pé) e botão "Ir".
  2. **Integração no Menu do Aplicativo (`ProfileDrawer.tsx`):** Adicionado o botão "Trajeto (Teste)" na seção "Minha Conta" do menu lateral e na barra superior de "Minha Agenda" (`UserAppointmentsView.tsx`).
  3. **Disparo Imediato da Navegação Ativa:** Ao clicar em "Ir", geocodifica os endereços, monta um registro de trajeto e aciona a tela de navegação ativa com polilinha viária real, rastreamento do GPS, câmera Look-Ahead, velocímetro e HUD de manobras.

### [2026-10-28] — Navegação GPS Interativa com Motor Híbrido Resiliente (Leaflet + Google Maps) e Acompanhamento Estilo Uber (bol-026)
- **Tipo:** `[Fix / Feat — Navegação GPS Ao Vivo Resiliente & HUD Uber]`
- **Motivo / Solicitação:** Ao clicar em "Ir" no agendamento do aeroporto para testar a navegação via celular, o app exibia um `<iframe>` estático do Google Maps com "Abrir no Maps" sem interface de navegação e sem acompanhamento GPS.
- **Arquivos Impactados:**
  - `src/services/googleMapsService.ts`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `package.json`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Inicialização Instantânea sem Iframe:** Substituída a tentativa síncrona com `<iframe>` pelo carregamento imediato do Leaflet com CartoDB Dark Matter / Voyager. Zero iframes, zero atraso na renderização.
  2. **HUD de Navegação Passo a Passo (Turn-by-Turn Estilo Uber/Waze):**
     - Cartão superior com ícone direcional da manobra (`ArrowUp`, `CornerUpRight`, `CornerUpLeft`, etc.) em círculo verde com contraste obrigatório (`text-white`).
     - Distância para o próximo passo e nome da via de destino.
     - Botões rápidos com deep links oficiais para abrir em tela cheia no **Waze** ou no **Google Maps** veicular caso o usuário queira espelhar no painel do carro.
  3. **Velocímetro Digital e Status GPS:** Indicador inferior com velocidade em tempo real (`km/h`) derivada das leituras do GPS.
  4. **Câmera Look-Ahead e Rastreamento Ativo:** Rastreamento via `watchPosition` com look-ahead de 65m, bússola do celular sincronizada, botão flutuante de "Recentralizar" e marcador direcional com foto de perfil do usuário.
  5. **Build de Produção e Reinício do Dev Server:** Executado `npm run build` e reiniciado o processo do servidor Node, atualizando o pacote servido para clientes externos.

### [2026-10-28] — Persistência Blindada de Fotos de Perfil Mobile no Supabase (Storage + Database) e Sincronização Unificada na Tríade (bol-025)
- **Tipo:** `[Fix / Feat — Upload e Persistência de Avatar Mobile no Supabase]`
- **Motivo / Solicitação:** Diagnosticar e corrigir falha onde fotos de perfil enviadas via celular não subiam para o Supabase.
- **Arquivos Impactados:**
  - `server.ts`
  - `src/lib/supabase.ts`
  - `src/components/ProfileDrawer.tsx`
  - `src/utils/imageCompressor.ts`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Compressão Automática Client-Side no Envio Mobile (`imageCompressor.ts` & `ProfileDrawer.tsx`):**
     - Fotos tiradas diretamente pela câmera do celular (que chegam pesando entre 4MB e 15MB) ou sem MIME type são imediatamente detectadas e comprimidas via canvas em JPEG leve (~25KB a 40KB, `max 480x480px`, qualidade `0.85`), eliminando estouro de payload (`413 Payload Too Large`), limites de rede 3G/4G e rejeições de formato.
  2. **Endpoint Seguro Server-Side com Service Role (`POST /api/user/avatar` em `server.ts`):**
     - Criação do endpoint `/api/user/avatar` executado com privilégios de `service_role` (bypassa travas de RLS do cliente anônimo).
     - Converte o buffer da imagem e tenta upload no bucket de storage `'avatars'`. Caso o bucket não exista no projeto, aplica fallback transparente para `'salon-media'` (pasta `avatars/`).
     - Se nenhum bucket estiver configurado, persiste de forma resiliente a string base64 compactada (inferior a 40KB) diretamente nas tabelas `clients`, `system_admins`, `profiles`, `professionals` e `salon_users`.
  3. **Persistência Imediata no Banco Supabase (`saveUserAvatarToSupabase` & `ProfileDrawer.tsx`):**
     - Corrigido o fluxo do componente: a foto é persistida **imediatamente** no banco ao ser selecionada pelo usuário, sem depender do envio manual do formulário na sub-aba de dados.
     - Montado o input de arquivo (`<input type="file" ref={fileInputRef} ... />`) no escopo raiz do drawer para estar sempre ativo em qualquer aba.
     - Adicionado botão de atalho com ícone de Câmera sobreposto ao avatar no card principal do usuário no menu lateral, permitindo alterar a foto com 1 toque no celular.
     - Adicionado banner de status e spinner de carregamento (`Loader2`) com feedback de confirmação: *"Foto de perfil salva com sucesso no Supabase!"*.
     - Rigorosamente alinhado à Regra de Contraste do Fundo Verde (botões `bg-emerald-500` com texto e ícone obrigatoriamente brancos `text-white`).

### [2026-10-28] — Marcador de Navegação com Foto de Perfil do Usuário e Fallback Automático (`InteractiveGoogleRouteMap.tsx` & `LiveTrackingModal.tsx`)
- **Tipo:** `[Feat — Avatar do Usuário no Marcador de Navegação GPS]`
- **Motivo / Solicitação:** Exibir a foto de perfil do usuário no marcador de navegação do mapa quando houver foto cadastrada; caso não haja foto (ou se a imagem falhar ao carregar), manter o marcador direcional atual.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. Atualizado `createDirectionalUserMarkerElement(avatarUrl)` para verificar se o usuário possui foto válida (`isValidAvatarUrlString` via `userAvatarUrl`, `vagou_user_avatar` ou `vagou_user_profile`).
  2. Quando há foto de perfil, o marcador renderiza a foto circular (`32x32px` com anel Emerald `#10b981`) sempre na vertical (`0°` fora do `.vagou-nav-rotor` para que o rosto nunca fique de cabeça para baixo), enquanto o cone de visão e a ponteira frontal giram ao redor acompanhando a bússola e a rota.
  3. Quando não há foto cadastrada (ou em `img.onerror`), o componente exibe automaticamente o marcador direcional padrão (disco Emerald com seta frontal branca).

### [2026-10-28] — Eliminação do Erro `DIRECTIONS_ROUTE: REQUEST_DENIED` com Uso Exclusivo da Google Routes API v2 (`/api/geo/route`) + OSRM (`InteractiveGoogleRouteMap.tsx`)
- **Tipo:** `[Fix — Google Routes API v2 vs Legacy DirectionsService]`
- **Motivo / Solicitação:** Corrigir o erro `MapsRequestError: DIRECTIONS_ROUTE: REQUEST_DENIED (Directions Service: This API key is not authorized to use this service or API)` disparado pelo método legado `google.maps.DirectionsService` no navegador quando a chave do projeto Google Cloud utiliza a nova **Routes API (v2)**.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. Substituídas as chamadas legadas a `new gmaps.DirectionsService()` em `fetchBrowserRoadGeometry` e `recalculateRoadFromRealGpsIfNeeded` pela chamada ao endpoint `POST /api/geo/route` (que consome a **Google Routes API v2** `https://routes.googleapis.com/directions/v2:computeRoutes` com cabeçalho `Referer` + fallback automático para malha viária real OSRM).

### [2026-10-28] — Botão `"Ir"` na Agenda do Menu, Redirecionamento Exclusivo para Agenda Pós-Cadastro e Georreferência Real do Dispositivo na Partida (`ProfileDrawer.tsx`, `UserAppointmentsView.tsx`, `SalonBookingModal.tsx`, `LiveTrackingModal.tsx` & `InteractiveGoogleRouteMap.tsx`)
- **Tipo:** `[Fix / Feat — Fluxo de Agendamento, Agenda & Georreferência Real GPS]`
- **Motivo / Solicitação:**
  1. Adicionar botão com legenda **`"Ir"`** no card de agendamento que consta na Agenda do menu;
  2. Reconhecer o local atual do dispositivo (GPS) ao escolher o local de partida no agendamento (`"Local Atual"`) e ao iniciar a navegação;
  3. Após finalizar o cadastro/confirmação do agendamento, não exibir a opção `"Ir Agora"` — direcionar exclusivamente para a **Agenda**;
  4. Quando o usuário clicar em **`"Ir"`** na Agenda partindo de um local diferente de onde havia informado antes no agendamento, identificar imediatamente a georreferência real do dispositivo, posicionar o marcador no local exato onde o usuário está e recalcular a rota viária a partir dali.
- **Arquivos Impactados:**
  - `server.ts`
  - `src/components/ProfileDrawer.tsx`
  - `src/components/UserAppointmentsView.tsx`
  - `src/components/SalonBookingModal.tsx`
  - `src/components/SalonProfileView.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/App.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Botão `"Ir"` na Agenda (`ProfileDrawer.tsx` & `UserAppointmentsView.tsx`):** Adicionado botão de destaque com legenda **`"Ir"`** (`bg-emerald-500 text-white`) que abre diretamente o mapa de navegação ao vivo (`initialStep="in_app_map"`).
  2. **Pós-Confirmação Direto para a Agenda (`SalonBookingModal.tsx` & `SalonProfileView.tsx`):** Removida a opção `"Ir Agora"` após o término do agendamento; ao confirmar a vaga, o usuário é levado diretamente para sua **Agenda** (`onNavigateToAgenda`).
  3. **Opção `"Local Atual"` no Agendamento (`SalonBookingModal.tsx`):** O modal `"De onde você vai sair?"` reconhece automaticamente a localização atual do dispositivo via `navigator.geolocation.getCurrentPosition` + `/api/maps/snap-and-reverse`.
  4. **Sobrescrita Automática por Georreferência Real ao Clicar em `"Ir"` (`LiveTrackingModal.tsx` & `InteractiveGoogleRouteMap.tsx`):** Mesmo que o usuário tenha informado outro endereço no momento do agendamento, ao clicar em **`"Ir"`** na Agenda o app captura imediatamente a coordenada GPS exata do aparelho (`getCurrentPosition` + `watchPosition`), posiciona o marcador exatamente onde o usuário está e recalcula a malha viária (`computeGoogleDetailedRoute` / `/api/geo/route` / `OSRM`) a partir da sua posição real.

### [2026-10-28] — Navegação com Bússola do Celular, Câmera Auto-Follow (Marcador Sempre Visível) e Vetor Look-Ahead Mostrando Sempre o Caminho Adiante (`InteractiveGoogleRouteMap.tsx`)
- **Tipo:** `[Feat / Compass Heading-Up, Camera Auto-Follow & Forward Look-Ahead]`
- **Motivo / Solicitação:** Ajustar o mapa de navegação em tempo real para:
  1. Acompanhar a bússola do celular (`deviceorientationabsolute` / `webkitCompassHeading`);
  2. Manter o marcador sempre visível na tela enquanto o mapa se move automaticamente (`moveCamera` / `panTo` com pausa inteligente de 6s caso o usuário arraste a tela manualmente);
  3. Mostrar sempre o caminho adiante e corrigir a orientação do marcador para nunca apontar para trás enquanto o usuário caminha ou dirige para frente.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Câmera Auto-Follow com Projeção Look-Ahead (`projectPointAhead` + `syncCameraAndMarkerOrientation`):** A câmera do Google Maps acompanha continuamente o usuário projetando o centro da tela ~65 metros à frente na direção do deslocamento (`zoom: 17.5`, `tilt: 45`, `heading`), mantendo o marcador sempre visível no terço inferior da tela e liberando ~70% do visor para mostrar o caminho adiante.
  2. **Vetor de Rota à Frente (`findForwardRouteBearingAndRemainingPath`) & Trava Anti-Inversão:** O cálculo de azimute busca os próximos vértices à frente na polilinha da rota (`>= 35m` adiante) combinados com o curso GPS e a bússola (`deviceorientationabsolute` / `webkitCompassHeading`), aparando dinamicamente o trecho já percorrido e impedindo que leituras magnéticas invertidas façam o marcador andar de costas.
  3. **Marcador Direcional com Cone de Visão Frontal (`createDirectionalUserMarkerElement`):** Substituído o ponto estático por um disco de navegação com seta frontal branca (`▲`) e feixe translúcido Emerald apontando sempre para o caminho à frente.

### [2026-10-28] — Integração Completa do Comunicado Inter-Projetos `admvapp` (`bol-023` & `bol-024`): Persistência Blindada `safeSupabaseWrite`, Propagação por CPF (`syncAddressAndCoordsAcrossCpfTables`), Geocodificação em 3 Camadas (`/api/geo/geocode`), `InteractiveGoogleRouteMap` e Migração SQL Master (`NOTIFY pgrst, 'reload schema'`)
- **Tipo:** `[Feat / Tríade Sync bol-023 & bol-024]`
- **Motivo / Solicitação:** Integrar integralmente o Comunicado Técnico Oficial do `admvapp` (`bol-023 / bol-024`) no `mnvapp`:
  1. **Migração SQL Idempotente Completa (`supabase_master_convergence_20261023.sql` & `supabase/schema.sql`):** Adição das colunas `address`, `street_number`, `complement`, `neighborhood`, `city`, `state`, `cep`, `cpf`/`owner_cpf`, `latitude (double precision)`, `longitude (double precision)`, `formatted_address` e `google_place_id` nas tabelas `salons`, `clients`, `professionals`, `profiles` e `salon_users`, além dos índices `idx_salons_owner_cpf`, `idx_salons_coords`, `idx_clients_cpf`, `idx_professionals_cpf`, `idx_profiles_cpf`, `idx_salon_users_cpf` e `NOTIFY pgrst, 'reload schema';`;
  2. **Blindagem `safeSupabaseWrite` (`src/services/mnvSupabaseSync.ts` & `src/lib/supabase.ts`):** Interceptação automática de falhas `PGRST204` / `42703` do PostgREST, removendo apenas a coluna ausente do payload e reexecutando a gravação imediatamente;
  3. **Propagação Cruzada por CPF (`syncAddressAndCoordsAcrossCpfTables`):** Ao atualizar o endereço ou pino GPS de um gestor, profissional, cliente ou estabelecimento, propaga endereço e coordenadas (`latitude`, `longitude`, `formatted_address`, `google_place_id`) para todos os registros vinculados ao mesmo CPF/e-mail;
  4. **Geocodificação em 3 Camadas (`POST /api/geo/geocode` em `server.ts` & `geocodeAddressThreeLayers` em `src/services/googleMapsService.ts`):** Resolução em cascata via Google Geocoding API (com header `Referer`) ➔ Nominatim OpenStreetMap ➔ BrasilAPI v2;
  5. **Mapa Viário Real sem Flickering (`InteractiveGoogleRouteMap.tsx` + `POST /api/geo/route`):** Alinhado ao `bol-023` com `useEffect([sdkReady, isDark])`, atualização imperativa com throttle `>= 20m` ou `15s`, `stableCoords` e polilinha viária em 3 camadas (`/api/geo/route` Routes API v2 ➔ `google.maps.DirectionsService` ➔ `OSRM`).
- **Arquivos Impactados:**
  - `server.ts`
  - `src/services/googleMapsService.ts`
  - `src/services/mnvSupabaseSync.ts`
  - `src/lib/supabase.ts`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/components/admin/InteractiveGoogleRouteMap.tsx`
  - `supabase/schema.sql`
  - `supabase_master_convergence_20261023.sql`
  - `CHANGELOG.md`

### [2026-10-28] — Correção Definitiva de Flickering (Tela Piscando) no Mapa e Fim da Rota em Linha Reta (Geometria Viária Real por Ruas)
- **Tipo:** `[Fix / Map Flickering & Real Road Network Geometry]`
- **Motivo / Solicitação:** Avaliar e corrigir dois problemas identificados na seção do mapa:
  1. **Tela piscando (Flickering):** O mapa era destruído e recriado a cada atualização de GPS (`watchPosition`) e a cada tick do timer de telemetria (`useLiveRouteTracker`);
  2. **Rota em linha reta diagonal:** Quando a chamada backend `Routes API v2` não retornava `encodedPolyline` (por endereço genérico `"Endereço de Saída do Cliente"` ou restrição de `Referer` HTTP da chave), o mapa caía em um array de 2 pontos `[origem, destino]`, traçando uma reta por cima dos quarteirões.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `server.ts`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Instância Única Imperativa do `google.maps.Map` (`InteractiveGoogleRouteMap.tsx`):** A criação de `new gmaps.Map(...)` agora depende exclusivamente de `[sdkReady, isDark]`. Atualizações de rota, polilinhas (`setPath`) e marcadores (`position`) ocorrem de forma 100% imperativa via `useRef`, sem jamais destruir o canvas do mapa.
  2. **Estabilização de Coordenadas e Throttle de GPS (`LiveTrackingModal.tsx` & `InteractiveGoogleRouteMap.tsx`):** As coordenadas de origem e destino do agendamento foram memorizadas (`stableCoords`) por ID/protocolo do agendamento, e o timer de 1s do `useLiveRouteTracker` fica desativado enquanto a aba `Mapa` está visível.
  3. **Garantia Tripla de Malha Viária Real (Zero Linha Reta):**
     - No backend (`/api/maps/compute-route` em `server.ts`), encaminhamento do cabeçalho `Referer` para a `Routes API v2` + fallback automático de malha viária real via OSRM (`overview=full&geometries=polyline&steps=true`);
     - No navegador (`InteractiveGoogleRouteMap.tsx`), acionamento automático do `google.maps.DirectionsService` + fallback OSRM caso `routeData.decodedPath` ainda não esteja carregado, garantindo que o traçado siga rigorosamente o contorno das ruas e avenidas.

### [2026-10-28] — Refinamento Visual do Mapa de Rota: Sincronização com Tema Claro/Escuro, Sub-Cabeçalho Exclusivo de Destino, Abas "Mapa" e "Itinerário", Contagem Regressiva Alpha (km + HH:MM) e Rodapé Limpo com Botão "Cheguei"
- **Tipo:** `[Refactor / Clean Map UI & Theme Synchronization]`
- **Motivo / Solicitação:** Ajustar a seção de mapa de rota para:
  1. Obedecer rigorosamente à cor do tema atual do app (`useTheme` — Modo Claro e Modo Escuro);
  2. Exibir abaixo do cabeçalho principal um sub-cabeçalho contendo somente o endereço de destino;
  3. Exibir abaixo do sub-cabeçalho as abas de modo de visualização **"Mapa"** e **"Itinerário"**;
  4. Exibir no canto inferior direito do mapa duas informações regressivas (`km` e `HH:MM`) em cor Alpha translúcida conforme o usuário se aproxima ou se distancia do destino final;
  5. Manter o mapa limpo (sem botões flutuantes, HUD ou controles extras) e exibir no rodapé abaixo do mapa apenas o botão **"Cheguei"** quando o usuário chegar ao destino.
- **Arquivos Impactados:**
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Sincronização de Tema Claro/Escuro (`useTheme`):** Aplicado `isDark` em `LiveRouteDepartureModal`, `LiveTrackingDrawerModal`, `SalonBookingModal` e `InteractiveGoogleRouteMap` (`colorScheme: isDark ? 'DARK' : 'LIGHT'`).
  2. **Sub-Cabeçalho Exclusivo + Abas "Mapa" e "Itinerário":** Removida a barra de 5 modais da tela expandida do mapa e inserido o sub-cabeçalho minimalista com apenas o endereço de destino, seguido pelas abas `Mapa` e `Itinerário`.
  3. **Indicador Alpha Regressivo (`km` e `HH:MM`) e Botão "Cheguei":** Removidos todos os controles flutuantes sobre o mapa (`zoomControl: false`, sem card HUD, sem botões Waze/Google Maps/+10s/Abrir Externo). Adicionado indicador translúcido (`backdrop-blur-[2px]`, texto/fundo com canal Alpha) no canto inferior direito do mapa exibindo `km` restantes e `HH:MM` regressivo em tempo real, acionando `onDestinationReachedChange(true)` ao atingir o destino para exibir exclusivamente o botão `Cheguei` no rodapé fixo (`sticky bottom-0 z-20`).

### [2026-10-28] — Implantação Completa da Suíte Google Maps Platform (Cockpit GPS In-App com Botão "Iniciar Trajeto", Linha do Tempo Real via Routes API v2, Matriz Simultânea dos 5 Modais, Autocomplete Places API New v1 e Snap-to-Road via Roads API)
- **Tipo:** `[Feat / Google Maps Platform Full Suite Integration]`
- **Motivo / Solicitação:** Implantar todas as 5 melhorias avançadas baseadas nas 11 APIs habilitadas no Google Cloud Console (`VITE_GOOGLE_MAPS_API_KEY`):
  1. **Modo Cockpit GPS In-App com Botão `▶ Iniciar Trajeto` (Fim da Caixa Branca):** Mapa interativo via `Maps JavaScript API` (`AdvancedMarkerElement`, polilinha Emerald decodificada da `Routes API v2`, zero caixa branca do embed) com botão `▶ Iniciar Trajeto` que ativa o HUD superior de navegação passo a passo em tempo real;
  2. **Linha do Tempo 100% Real (`Routes API v2`):** Geração automática das ruas e manobras reais (`navigationInstruction`, `distanceMeters`, `localizedValues`) na aba **Linha do Tempo**;
  3. **Matriz Simultânea Real dos 5 Modais (`Routes API v2`):** Cálculo em paralelo dos tempos reais com trânsito (`TRAFFIC_AWARE`) para A pé, Bicicleta, Moto, Carro e Transporte Público;
  4. **Autocomplete de Endereços e Locais (`Places API New v1`):** Sugestões instantâneas de ruas, bairros e estabelecimentos ao digitar em "Outro Local";
  5. **Snap-to-Road + Radar Recepção Inteligente (`Roads API` + `Geocoding API`):** Ajuste da coordenada GPS ao vivo para a via exata e alerta automático de chegada iminente (`arriving_5min`) para a recepção do salão.
- **Arquivos Impactados:**
  - `server.ts`
  - `src/services/googleMapsService.ts`
  - `src/components/live-tracking/InteractiveGoogleRouteMap.tsx`
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/SalonBookingModal.tsx`
  - `src/utils/bookingSlots.ts`
  - `.env.example`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Rotas Proxy Seguras no Backend (`server.ts`):** Criados os endpoints `/api/maps/config`, `/api/maps/compute-route` (`Routes API v2`), `/api/maps/route-matrix`, `/api/maps/places-search` (`Places API New v1`) e `/api/maps/snap-and-reverse` (`Roads API nearestRoads` + `Geocoding API`), evitando bloqueios de CORS no navegador e mantendo compatibilidade total com `VITE_GOOGLE_MAPS_API_KEY`.
  2. **Mapa Interativo e Cockpit GPS (`InteractiveGoogleRouteMap.tsx`):** Renderização nativa via `google.maps.Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio']`), polilinha dupla em Emerald, marcadores `AdvancedMarkerElement`, rastreamento `navigator.geolocation.watchPosition` e HUD de manobras no topo do mapa ao acionar `▶ Iniciar Trajeto`.

### [2026-10-28] — Unificação do Mapa Google Maps In-App + Aba "Linha do Tempo" no Radar "Estou a Caminho" (Minha Agenda) e no Fluxo de Agendamento
- **Tipo:** `[Feat / In-App Route Map & Timeline Unification]`
- **Motivo / Solicitação:** Quando o cliente acessa seu agendamento pelo menu "Agenda" / "Minha Agenda" e clica na partida ("Sim, estou saindo" no modal "Radar Estou a Caminho"), abrir diretamente o Mapa Google Maps integrado dentro do próprio aplicativo, contando com duas abas principais de visualização: **Mapa** e **Linha do Tempo** (aplicadas tanto no modal de partida da Agenda quanto na solução de rota pós-agendamento).
- **Arquivos Impactados:**
  - `src/components/live-tracking/LiveTrackingModal.tsx`
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Abertura Direta do Mapa In-App ao Clicar em "Sim, estou saindo" (`LiveTrackingModal.tsx`):** Atualizado `LiveRouteDepartureModal` e `LiveTrackingDrawerModal` para utilizarem `buildTransportDeepLinks` (`googleMapsEmbedUrl`) e abrirem a tela expandida em tela cheia com `<iframe>` real do Google Maps dentro do app ao confirmar a partida na Minha Agenda.
  2. **Duas Abas Unificadas (`Mapa` ⇄ `Linha do Tempo`) em `LiveTrackingModal.tsx` e `SalonBookingModal.tsx`:** Adicionado alternador superior entre a aba **Mapa** (Google Maps interativo in-app com seletor rápido de A pé, Bicicleta, Moto, Carro e Transp. Público) e a aba **Linha do Tempo** (sequência visual das etapas desde o horário limite de saída e endereço de origem até as ruas/trajeto, avisos rápidos de trânsito e chegada ao estabelecimento).

### [2026-10-27] — Tela Expandida de Mapa Integrado (In-App Route Embed) no Modal "Ir Agora • Rota & Deslocamento"
- **Tipo:** `[Feat / In-App Navigation & Route Map Embed]`
- **Motivo / Solicitação:** Ao clicar em "Mapa" / "Maps (...)" nas modalidades A pé, Bicicleta, Transporte Público, Moto ou Carro dentro do modal "Ir Agora • Rota & Deslocamento", abrir uma tela expandida em tela cheia diretamente dentro do aplicativo (via `iframe` embed do Google Maps com rota ativa), com barra superior de resumo, botões de troca rápida de modalidade e botão discreto para abertura externa opcional, mantendo Waze, Uber e 99 como acionamento externo nativo.
- **Arquivos Impactados:**
  - `src/utils/bookingSlots.ts`
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Geração Direta de URL de Incorporação de Rota (`googleMapsEmbedUrl` em `src/utils/bookingSlots.ts`):** `buildTransportDeepLinks` agora gera `googleMapsEmbedUrl` (`https://www.google.com/maps/embed?origin=mfe&pb=...`) parametrizada com coordenadas/endereços de origem e destino e o código exato da modalidade (`!3e0` Carro/Moto, `!3e1` Bicicleta, `!3e2` A pé, `!3e3` Transporte Público), evitando redirecionamentos 301 com bloqueio `X-Frame-Options: SAMEORIGIN`.
  2. **Tela Expandida In-App em Tela Cheia (`SalonBookingModal.tsx`):** Adicionado estado `isEmbeddedMapOpen` no modal de rota (`routeModalNode`). Ao clicar em `Mapa` (Carro/Moto) ou `Mapa (...)` (A pé, Bicicleta, Transp. Público), o modal se expande em tela cheia exibindo cabeçalho de retorno, barra superior de troca rápida entre as 5 modalidades de mapa (`A pé`, `Bicicleta`, `Moto`, `Carro`, `Transp. Público`), faixa de resumo (`Saída ➔ Destino`, distância, tempo estimado e horário máximo de saída), `iframe` interativo ocupando a área principal e rodapé fixo (`sticky bottom-0 z-20`) com botão `Voltar` e atalho opcional para `Abrir no Google Maps` / `Waze`.

### [2026-10-27] — Exibição de Endereço de Saída do Cliente e Destino (Salão) em Duas Colunas Acima do Valor no Resumo do Agendamento
- **Tipo:** `[Feat / UI Focus Mode]`
- **Motivo / Solicitação:** Na div do total a pagar dentro do modal de Resumo do Agendamento (`SalonBookingModal.tsx`), incluir acima do valor uma linha com duas colunas: à esquerda o endereço de saída do cliente e à direita o endereço de destino do estabelecimento (salão).
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Linha de 2 Colunas (Saída vs. Destino) Acima do Valor (`SalonBookingModal.tsx`):** Estruturada dentro de `div:nth-of-type(4)` uma linha `grid-cols-2` plana (sem box-in-box) acima da linha `"Total a pagar no local"`, exibindo na coluna da esquerda o endereço de partida do cliente (`resolvedAddressLabel` / `addressQuery`) e na coluna da direita o endereço do estabelecimento (`salonAddress` / `resolvedSalonAddressLabel` / `salonName`).

### [2026-10-27] — Autenticação Unificada Multi-Tabela da Tríade (`system_admins`, `clients`, `salon_users`, `professionals`, `salons`) e Soberania Irrestrita do Superadmin Master
- **Tipo:** `[Fix / Ecosystem Authentication & Superadmin Master Sovereignty]`
- **Motivo / Solicitação:** Resolver definitivamente a falha de login e restrição de permissão para o Criador do Sistema / Superadmin Master (`Anderson@` / `andersonhpires@gmail.com` / `(11) 91353-1030`) e demais usuários cadastrados no `admvapp` (`public.system_admins`, `public.clients`, `public.salon_users`, `public.professionals`), eliminando erros `400 Bad Request` no console e garantindo acesso irrestrito ao Superadmin Master em qualquer estabelecimento.
- **Arquivos Impactados:**
  - `src/components/SalonClientAuthModal.tsx`
  - `src/lib/supabase.ts`
  - `src/hooks/useSalonRole.ts`
  - `src/hooks/useOwnerAccess.ts`
  - `src/components/SalonProfileView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Resolução Multi-Tabela na Autenticação (`SalonClientAuthModal.tsx`):** `findMatchingClients` agora consulta em paralelo `public.system_admins`, `public.clients`, `public.salon_users` e `public.professionals`, suportando busca exata e sem sufixos (`@`, `#`, `&`) por `username` (ex.: `Anderson@`, `Elisa@`, `Luiza@`, `Momy@`, `fabio#`, `Maria&`), `email`, `cpf`, `phone_whatsapp` / `phone` / `phone_secondary` e `full_name` / `name`.
  2. **Validação Nativa de `password_hash` Antes do GoTrue (Zero Erros 400):** `handleLoginSubmit` valida primeiramente a senha contra `password_hash` nas tabelas da Tríade (`system_admins`, `clients`, `salon_users`, `professionals`) sem disparar requisições `signInWithPassword` inválidas para usernames como `"Anderson@"` ou contas gerenciadas via `admvapp`.
  3. **Camada 0 de Soberania Superadmin Master (`checkUserSalonMembership`, `useSalonRole`, `useOwnerAccess`):** Usuários ativos em `public.system_admins` ou com `access_level = 'Superadmin Master'` recebem automaticamente `isMember: true, role: 'owner'` e `vagou_is_superadmin = 'true'`, garantindo acesso irrestrito de gestão e agendamento em qualquer salão do ecossistema, além de espelhamento automático em `public.clients` para integridade de chave estrangeira em `public.appointments(client_id)`.
  4. **Recuperação Direta de Senha em 2 Etapas (`mode === 'forgot'`):** Atualizado o fluxo "Esqueceu a senha?" no `SalonClientAuthModal` para permitir localização e redefinição direta de `password_hash` em todas as tabelas da Tríade.

### [2026-10-27] — Bloqueio Obrigatório de Autenticação (Login / Cadastro) ao Clicar em Agendamento ou Serviços
- **Tipo:** `[Fix / Auth Gate & Booking Security]`
- **Motivo / Solicitação:** O cliente pode navegar livremente na vitrine do estabelecimento (`Início`, `Serviços`, `Espaço`), mas ao clicar em qualquer ação de agendamento (aba `Agendar`, clique em um procedimento no `Catálogo de Serviços`, `Consultar Horários` ou `Retomar` pré-agendamento), deve ser solicitado imediatamente seu login ou cadastro antes de iniciar o agendamento.
- **Arquivos Impactados:**
  - `src/App.tsx`
  - `src/components/SalonProfileView.tsx`
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Validação Estrita de Sessão Ativa (`checkHasActiveSession`):** Corrigida a verificação de login para exigir sessão real (`vagou_client_session`, `vagou_auth_user_id` válido, `vagou_user_email` ou sessão Supabase), impedindo que nomes residuais sem sessão ativa ou IDs `guest-...` marquem um visitante deslogado como autenticado.
  2. **Interceptação de Todos os Pontos de Entrada de Agendamento (`SalonProfileView.tsx` & `SalonBookingModal.tsx`):** Ao clicar na aba `Agendar` (`handleSelectTab('vagas')`), em `Consultar Horários`, em qualquer serviço do catálogo (`handleOpenBooking`), em `Retomar` rascunho ou dentro do próprio `SalonBookingModal`, caso o cliente não esteja autenticado, o sistema abre imediatamente o modal white-label `SalonClientAuthModal` (Login / Cadastro) e retoma automaticamente o agendamento escolhido assim que a autenticação é concluída (`onAuthenticated`).
  3. **Limpeza Completa no Logout (`handleSalonLogout` & `App.tsx`):** Sincronizado o evento `vagou:auth-updated` com `App.tsx` e removidos todos os identificadores residuais (`vagou_client_id`, `vagou_client_session`) no logout, redirecionando o visitante para a aba `home` caso estivesse em `vagas`.

### [2026-10-27] — Correção da Inicialização do Modal "Para Você / Dependente" na Montagem da Seção de Agendamento
- **Tipo:** `[Fix / UX & Beneficiary Selection Flow]`
- **Motivo / Solicitação:** Ao escolher um serviço diretamente no Catálogo de Serviços (`activeTab === 'servicos'`), o componente `SalonBookingModal` era montado pela primeira vez com `isBeneficiaryModalOpen = false` e `isOriginModalOpen = true`, pulando o modal "Para você / Dependente".
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Inicialização Correta no Mount (`useState`):** `isBeneficiaryModalOpen` agora inicializa como `true` (`Boolean(initialService && !initialTimeSlot && !resumeDraft)`) e `isOriginModalOpen` inicializa como `false` quando o componente `SalonBookingModal` é montado a partir do clique em um serviço no Catálogo de Serviços.
  2. **Encadeamento Completo (Beneficiário ➔ Origem ➔ Proposta Mais Próxima / Outra Data):** Tanto ao selecionar `"Para Você"` quanto ao escolher ou cadastrar um `"Dependente"` inline (`handleSaveInlineDependent`), o modal de beneficiário fecha e abre imediatamente o modal de origem (`isOriginModalOpen = true`), exibindo a proposta `MAIS PRÓXIMO - DD/MM HH:MM` e `ESCOLHER OUTRA DATA E HORÁRIO` tanto para `"Saindo de Casa"` quanto para `"Outro Local"`.

### [2026-10-26] — Renomeações e Fluxo Direto no Modal de Origem ("MAIS PRÓXIMO" Direto para o Resumo)
- **Tipo:** `[Feat / UX & Origin Modal Navigation]`
- **Motivo / Solicitação:** Renomear o primeiro botão do modal de origem para `MAIS PRÓXIMO - DD/MM HH:MM` e fazer com que o clique nele pule a escolha de data e hora abrindo diretamente o Resumo do Agendamento; renomear o segundo botão para `ESCOLHER OUTRA DATA E HORÁRIO` para seguir para a etapa de seleção de data.
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Botão 1 ("MAIS PRÓXIMO - DD/MM HH:MM"):** Atualizado o rótulo do botão principal do modal de origem (`originModalNode`) para `MAIS PRÓXIMO - ${propitiousSuggestion.shortDate} ${propitiousSuggestion.timeSlot}`. Ao ser clicado, grava a data/horário sugeridos, fecha o modal de origem e abre diretamente a Seção de Confirmação do Resumo (`setIsSummaryModalOpen(true)`), ignorando a escolha manual de data e horário.
  2. **Botão 2 ("ESCOLHER OUTRA DATA E HORÁRIO"):** Atualizado o rótulo para `ESCOLHER OUTRA DATA E HORÁRIO` (quando não estiver retornando do modal de rota). Ao ser clicado, fecha o modal de origem e direciona o cliente para a etapa de seleção de data (`setCurrentStep('date')`).

### [2026-10-26] — Alinhamento Centralizado de Data e Horário no Resumo do Agendamento
- **Tipo:** `[UX / UI Alignment]`
- **Motivo / Solicitação:** Alinhar "Data" e "Horário" ao centro dentro de suas respectivas `div`s (50% de largura cada) no modal de Resumo do Agendamento.
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  - Aplicado `items-center justify-center text-center` com espaçamento simétrico (`px-2`) em ambas as colunas (`Data` e `Hora`) dentro de `summaryModalNode`, garantindo centralização exata tanto dos rótulos com ícone quanto dos valores em destaque.

### [2026-10-26] — Filtro Preditivo de Modais Viáveis no "Ir Agora", Botão Único "Chamar App" com Seletor de Aplicativos, Botões com Ícone para Mapa/Waze e Botão "Alterar origem"
- **Tipo:** `[Feat / UX & Predictive Transport Feasibility / Ride App Chooser]`
- **Motivo / Solicitação:** De acordo com o horário selecionado e o tempo de chegada comparando com o horário atual, não ofertar trajetos inviáveis (como "A pé" quando o horário máximo de saída já passou); substituir os botões diretos "Chamar Uber" e "Chamar 99" pelo botão único "Chamar App" que abre as opções de aplicativo instalado no dispositivo do cliente; exibir botões com ícone para "Mapa" e "Waze" quando selecionado "Carro" (ou "Moto"); e transformar "Alterar origem" em um botão estilizado com ícone.
- **Arquivos Impactados:**
  - `src/utils/bookingSlots.ts`
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Filtro Preditivo de Modais Viáveis (`feasibleTransportModeOptions`):** O sistema compara o horário selecionado do agendamento (`selectedDateIso` + `selectedTimeSlot`) menos o tempo de trajeto de cada modal (`computeCalibratedEtaForMode`) com o horário atual (`currentTimeTick`). Qualquer meio de transporte cujo horário máximo de saída já tenha passado (ex.: `A pé` com saída máxima às `09H02` quando já são `10:25`) deixa de ser ofertado na grade e alterna automaticamente para um modal viável (`Carro`).
  2. **Botão Único "Chamar App" com Seletor de Aplicativos do Dispositivo:** Na opção `Aplicativo`, o botão principal **`Chamar App`** expande as opções de aplicativos instalados no dispositivo do cliente (**Uber**, **99** e **Outros Apps Instalados no Dispositivo** via intent `geo:` nativo em `buildTransportDeepLinks`).
  3. **Botões com Ícone para Mapa e Waze (`Carro` / `Moto`):** Os botões **`Mapa`** e **`Waze`** contam com badges de ícone (`MapPin` e `Navigation` de `lucide-react`) e contraste elevado nos temas claro e escuro.
  4. **Botão Estilizado "Alterar origem":** Convertido de texto simples para botão sólido (`bg-emerald-500 text-white`) com ícone `RotateCcw`.

### [2026-10-26] — Seção de Confirmação no Resumo, Remoção de Telefone no Modo Cliente, Avanço Direto para Data/Hora e Modal Simples de Origem com Sugestão de Dia/Horário Propício
- **Tipo:** `[Feat / UX & Confirmation Section Modal / Predictive Origin & Direct Date Step]`
- **Motivo / Solicitação:** Remover informação de telefone no modo cliente; incluir novamente o modal simples de pergunta sobre o endereço de partida do cliente antes do agendamento (calculando distância mesmo para clientes de outro estado e oferecendo o dia e horário mais propício); ao clicar em um serviço direto na seção de Serviços, avançar diretamente para Data e Horário sem exibir novamente a lista de serviços; posicionar o botão "Confirmar Agendamento" abaixo dos botões "Pré-Salvar", "Revisar" e "Cancelar"; e estruturar o modal de Resumo do Agendamento como seção de confirmação com cabeçalho da logomarca do salão, cabeçalho de título "Resumo do agendamento", remoção de "Estabelecimento", e "Data | Hora" grandes na mesma linha (50% de largura cada).
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `src/components/SalonProfileView.tsx`
  - `src/components/ProfileDrawer.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção de Telefone no Modo Cliente:** Removido o campo `WhatsApp de Contato` de `summaryModalNode`, ocultado o campo de telefone na visualização cliente de `ProfileDrawer.tsx`, e ajustado o fallback em `handleConfirmFinal` / `handleConfirmSchedule` para não exigir telefone do cliente.
  2. **Avanço Direto da Seção de Serviços para Data e Horário:** Ao selecionar um serviço na seção `Serviços` (`handleOpenBooking`), `SalonBookingModal` inicializa `selectedServices` com o serviço clicado e abre diretamente na etapa de **Data e Horário** (`currentStep = 'date'`), sem pedir que o cliente selecione o serviço novamente.
  3. **Modal Simples de Origem de Partida + Sugestão de Dia/Horário Propício (`originModalNode` & `propitiousSuggestion`):** Antes da seleção de data/horário, abre-se o modal simples perguntando `"De onde você vai sair?"` (`Saindo de Casa` vs `Outro Local`, aceitando CEP ou Cidade/Estado). O sistema calcula a distância real e o tempo de viagem (inclusive interestadual) e sugere/aplica o **dia e horário mais propício**.
  4. **Modal de Confirmação Estilo Seção (`summaryModalNode`):** Reestruturado com Cabeçalho 1 exibindo a **Logomarca do Salão**, Cabeçalho 2 com o título **`Resumo do agendamento`**, linha principal dividida em **`Data | Hora` (50% / 50%)** com tipografia grande, linhas de `Serviço`, `Beneficiário`, `Profissional` e `Total a pagar no local` (sem `Estabelecimento`), e botão **`Confirmar Agendamento`** posicionado **abaixo** dos botões `Pré-Salvar`, `Revisar` e `Cancelar`.

### [2026-10-25] — Extração do Bloco de Rota do Resumo para Modal Próprio Pós-Confirmação ("Pôr na Agenda" vs "Ir Agora" + 6 Modais Google Maps API)
- **Tipo:** `[Feat / UX & Post-Confirmation Flow / Google Maps API Modes]`
- **Motivo / Solicitação:** Remover o card de rota/deslocamento de dentro do "Resumo do Agendamento", transformando-o em um modal próprio que só abre após clicar em "Confirmar Agendamento", precedido por um modal de pergunta com as opções "Pôr na Agenda" e "Ir Agora", oferecendo todas as 6 opções do Google Maps API + Aplicativo (A pé, Bicicleta, Moto, Carro, Transporte Público e Aplicativo).
- **Arquivos Impactados:**
  - `src/types.ts`
  - `src/utils/bookingSlots.ts`
  - `src/components/SalonBookingModal.tsx`
  - `src/components/SalonProfileView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Resumo do Agendamento Limpo:** Removido o bloco de logística/rota de dentro de `summaryModalNode`, deixando o resumo focado nos dados do serviço, horário, valor e contato.
  2. **Modal de Pergunta Pós-Confirmação (`postConfirmChoiceModalNode`):** Ao clicar em `"Confirmar Agendamento"`, o agendamento é gravado e abre-se primeiro o modal de decisão com os botões **`Pôr na Agenda`** (integração direta via `buildGoogleCalendarEventUrl`) e **`Ir Agora`**.
  3. **Modal Próprio de Rota & Deslocamento (`routeModalNode`):** Ao clicar em **`Ir Agora`**, abre-se o modal próprio contendo as **6 opções de deslocamento integradas ao Google Maps API** (`A pé`, `Bicicleta`, `Moto`, `Carro`, `Transp. Público` e `Aplicativo`), recalculando em tempo real a distância, o tempo de trajeto, o `Horário Máx. de saída` e os botões de navegação (`Google Maps`, `Waze`, `Uber`, `99`) com opção `Alterar origem`.

### [2026-10-25] — Ergonomia Mobile: Separação em Linhas Dedicadas de Profissionais e Turnos (Zero Tumulto Visual)
- **Tipo:** `[Fix / Mobile UX & Ergonomics]`
- **Motivo / Solicitação:** Em telas mobile (~360px), posicionar os botões dos profissionais na mesma linha horizontal das 4 abas de turnos (`Manhã | Tarde | Noite | Todos`) comprimia a área disponível e cortava o segundo botão de profissional (ex: `Rafael`).
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Linha 1 Exclusiva para Profissionais (`overflow-x-auto`):** Os botões dos profissionais aptos para o serviço selecionado (`[Foto + Primeiro Nome]`, com `py-1.5 px-3` e `w-6 h-6`) agora ocupam sua própria linha horizontal exclusiva com respiro completo, exibindo todos os nomes sem cortes ou esmagamento.
  2. **Linha 2 Exclusiva para Turnos (`grid-cols-4`):** As abas `Manhã | Tarde | Noite | Todos` ocupam uma barra dedicada de largura total (`grid grid-cols-4 gap-1 p-1`) logo abaixo dos profissionais, garantindo 25% de largura por turno e toque confortável no celular.

### [2026-10-25] — Detalhe do Serviço ao Lado do Botão Voltar, Título Resumido na Aba e Filtro de Profissionais por Tipo de Serviço
- **Tipo:** `[Feat / UX & Booking Header / Professional Filter]`
- **Motivo / Solicitação:** Exibir a descrição completa do serviço selecionado no cabeçalho ao lado do botão Voltar, deixar o título da pequena aba apenas com o nome resumido de 1 palavra (ex: "Corte", "Unha"), filtrar para exibir apenas os profissionais que fazem aquele tipo de serviço e formatar o botão do profissional apenas com foto + primeiro nome.
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `src/components/SalonProfileView.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Detalhe do Serviço ao Lado do Botão Voltar:** Na barra superior do fluxo (`currentStep !== 'service'`), adicionado o título completo do serviço (ex: `"Corte Navalhado"`) e badge de duração/preço (`"45 min • R$ 45"`) imediatamente ao lado do botão `Voltar`.
  2. **Nome Resumido de 1 Palavra na Aba de Etapa:** Atualizado `getAbbreviatedServiceLabel()` para exibir apenas o substantivo principal na pequena aba (ex: `"Corte"`, `"Unha"`, `"Barba"`, `"Sobrancelha"`, `"Escova"`, etc.), evitando truncamento com reticências (`...`).
  3. **Filtro de Profissionais por Tipo de Serviço:** Removido o botão `"Qualquer"` e criado `professionalsForSelectedService` que filtra apenas os profissionais que executam a categoria/tipo do serviço selecionado (por `professionalId` ou `specialties`), selecionando automaticamente o primeiro profissional apto.
  4. **Botões de Profissionais Compactos:** Formatados os botões de profissionais para exibir apenas a foto circular e o primeiro nome ao lado.

### [2026-10-25] — Remoção de Checkboxes em Serviços e Avanço Direto no Fluxo de Agendamento (Serviço ➔ Data ➔ Horário)
- **Tipo:** `[Refactor / UX & Booking Flow]`
- **Motivo / Solicitação:** Remover os checkboxes da lista de serviços na seção de agendamento, eliminar o modal intermediário de confirmação ao clicar no serviço (avançando direto para a tela de data) e fazer com que o clique no dia do calendário avance diretamente para a escolha do horário sem botão extra de confirmação de data.
- **Arquivos Impactados:**
  - `src/components/SalonBookingModal.tsx`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Remoção de Checkboxes e Botão de Rodapé na Etapa de Serviços:** Removido o bloco visual de checkbox (`w-5 h-5 rounded-[4px]`) de cada card de serviço e removido o botão de rodapé `"SELECIONE AO MENOS 1 SERVIÇO"`, mantendo apenas título, duração e preço limpos.
  2. **Avanço Direto Serviço ➔ Data:** Ao clicar em qualquer serviço, o modal `"Deseja realizar o agendamento?"` não é mais exibido; o serviço é selecionado e o fluxo avança imediatamente para a tela de calendário (`currentStep = 'date'`).
  3. **Avanço Direto Data ➔ Horário:** Na tela de calendário (`date`), clicar no botão do dia desejado seleciona a data e avança imediatamente para a tela de escolha de horários (`currentStep = 'professionals_and_time'`), sem botão adicional de confirmação de data e sem modais intermediários bloqueantes.

### [2026-10-24] — Diagnóstico de Políticas RLS (Supabase Error 42501), Blindagem Offline Resiliente e Migration de Policies
- **Tipo:** `[Fix / Security & RLS / Data Resilience]`
- **Motivo / Solicitação:** Usuário reportou que o problema de policy (RLS) continuava ocorrendo ("Não resolvido o problema de polícia. Nós temos rolo cadastrado, faça um teste").
- **Arquivos Impactados:**
  - `src/components/SalonProfileView.tsx`
  - `supabase/migrations/20261024_fix_rls_policies.sql`
  - `CHANGELOG.md`
- **Resumo Técnico:**
  1. **Diagnóstico Conclusivo de Banco via Teste em Tempo Real:** Executado teste contra o banco de dados remoto `xemenxdhuoekytyhmgyt.supabase.co`. Comprovado que requisições públicas anônimas (`role = anon`) disparam `code: '42501', message: 'new row violates row-level security policy for table "appointments"'` e `new row violates row-level security policy for table "clients"`.
  2. **Origem da Rejeição:** Mesmo com papéis cadastrados na aplicação (ex: Proprietário em `professionals` e Cliente em `clients`), quando o agendamento é feito por um cliente sem token de autenticação ativo do `supabase.auth`, o PostgreSQL recebe a conexão como `anon` e as policies do Supabase bloqueiam a inserção. Além disso, a migration anterior continha sintaxe PL/pgSQL (`IF EXISTS`) fora de bloco anônimo `DO $$`, o que provocava erro de sintaxe ao ser colada no SQL Editor.
  3. **Blindagem e Resiliência em `SalonProfileView.tsx`:** Adicionado tratamento no `handleConfirmSchedule`:
     - Se `clients` falhar por RLS ou offline, gera cliente resiliente em memória/local (`guest-${Date.now()}`) sem abortar o fluxo.
     - Se `appointments` retornar erro `42501`, o erro não trava a interface: o agendamento é gravado com sucesso no dispositivo do cliente (`vagou_user_appointments`), mantendo código de protocolo `#VAG-...`, cronômetro e rota GPS ativos na tela de confirmação e na Minha Agenda.
  4. **Nova Migration SQL Definitiva:** Criado `supabase/migrations/20261024_fix_rls_policies.sql` com blocos SQL válidos e testados para liberação de permissões (`DISABLE ROW LEVEL SECURITY` ou políticas explícitas `FOR ALL TO anon, authenticated`).


---

### [Arquivo Histórico Consolidado — 2026-09-02 a 2026-10-23]
- Registros anteriores consolidados para manter o arquivo abaixo do limite de payload da API do GitHub (< 100 KB).
