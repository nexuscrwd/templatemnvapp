# Plano de Implementação: Tela Expandida de Mapa Integrado (In-App Route Map)

## 1. Objetivo
Permitir que o cliente visualize o mapa e o trajeto diretamente **dentro do aplicativo** em uma **tela expandida em tela cheia** ao clicar no botão **Mapa** / **Maps (...)** nas modalidades **A pé**, **Bicicleta**, **Transporte Público**, **Moto** e **Carro**, sem forçar a saída para o navegador externo. Aplicativos nativos de terceiros (**Waze**, **Uber**, **99**) permanecem com seu acionamento direto externo.

---

## 2. Experiência do Usuário (UX) & Interface
Quando o cliente estiver no modal **Ir Agora • Rota & Deslocamento** e clicar em **Mapa** (Carro/Moto) ou **Maps (...)** (A pé, Bicicleta, Transp. Público):

1. **Expansão em Tela Cheia (`isEmbeddedMapExpanded`):**
   - O modal se expande suavemente para ocupar a tela (`fixed inset-0 z-50`), estruturado em layout flexível vertical (`flex flex-col h-full w-full`).
2. **Barra Superior Compacta de Resumo & Controle:**
   - **Cabeçalho:** Botão **Voltar** (retorna ao resumo compacto do modal de rota), título **Mapa da Rota • [Modalidade]**, botão discreto **Abrir no App** (`ExternalLink` para quem desejar abrir no Google Maps nativo) e botão **Fechar** (`X`).
   - **Troca Rápida de Modalidade no Topo:** Barra horizontal de botões compactos para alternar instantaneamente entre **A pé**, **Bicicleta**, **Moto**, **Carro** e **Transp. Público**, atualizando imediatamente o mapa, a distância, o tempo de trajeto e o horário máximo de saída.
   - **Faixa de Resumo Rápido:** Exibe em linha única a **Distância (`km`)**, **Tempo estimado de trajeto** e **Horário Máx. de saída**, além dos pontos de **Saída** e **Destino**.
3. **Área Principal do Mapa Integrado (`iframe` Google Maps Embed):**
   - Ocupa todo o espaço restante da tela (`flex-1 w-full h-full`) exibindo o mapa interativo embutido com origem, destino e modo de deslocamento selecionado (`driving`, `walking`, `bicycling`, `transit`).
   - Inclui rodapé fixo (`sticky bottom-0 z-20`) com botão **Voltar para Rota & Deslocamento** e atalho opcional para **Waze** (quando em Carro/Moto) ou **Google Maps Externo**.

---

## 3. Arquivos Impactados
- **`/src/utils/bookingSlots.ts`**:
  - Atualização de `buildTransportDeepLinks` para gerar também a URL de incorporação (`googleMapsEmbedUrl`) compatível com `iframe` (`output=embed`), parametrizada com coordenadas/endereços de origem (`saddr`), destino (`daddr`) e flag de modalidade (`dirflg`: `d` para carro/moto, `w` para a pé, `b` para bicicleta, `r` para transporte público).
- **`/src/components/SalonBookingModal.tsx`**:
  - Adição do estado `isEmbeddedMapOpen` para controlar a exibição da tela expandida do mapa dentro do app.
  - Substituição dos links `<a target="_blank">` nos botões **Mapa** (Carro/Moto) e **Maps (...)** (A pé, Bicicleta, Transp. Público) por botões que abrem a visualização expandida in-app (`setIsEmbeddedMapOpen(true)`).
  - Construção da interface em tela cheia do mapa com barra de troca rápida de modalidade, resumo de distância/tempo/saída máxima, `iframe` responsivo em tela cheia e botão discreto para abertura externa opcional.
- **`/CHANGELOG.md`**:
  - Registro formal da melhoria para rastreabilidade e governança da Tríade.

---

## 4. Diretrizes de Design & Conformidade Vagou
- **Contraste Obrigatório:** Botões com fundo verde sólido (`bg-emerald-500`) terão texto e ícones 100% brancos (`text-white`).
- **Layout Limpo (Zero "Box dentro de Box"):** Superfícies planas bem definidas entre o topo de controle e o mapa em tela cheia.
- **Ícones Estritos:** Exclusivamente `lucide-react` (`MapPin`, `Navigation`, `ArrowLeft`, `ExternalLink`, `Clock`, `Car`, `Bike`, `Bus`, `Footprints`, `X`).
