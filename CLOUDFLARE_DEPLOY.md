# 🚀 Guia Definitivo de Implantação no Cloudflare (Pages / Workers) — Vagou

Este guia resolve de forma definitiva qualquer erro de instalação de dependências (como o `bun.lock / UnknownLockfileVersion` ou cache corrompido) no Cloudflare.

---

## 🛑 Por que esse erro acontece no Cloudflare?
O Cloudflare mantém um **cache de dependências** da primeira tentativa de build. Se um arquivo `bun.lock` antigo esteve presente, o Cloudflare continua restaurando esse cache (`Restoring from dependencies cache`) e tentando executar `bun install` mesmo depois que o arquivo foi apagado.

---

## 🔧 Solução em 2 Passos Simples no Painel do Cloudflare:

### 1. Limpar o Cache e Recompilar (Essencial!)
1. Na tela do build que falhou (ou na aba **Implantações / Deployments**), clique no botão **Tentar compilar novamente** (ou no menu de 3 pontos / seta ao lado).
2. Selecione a opção **"Limpar cache e implantar"** (ou **"Clear build cache and retry"**).
3. Isso força o Cloudflare a baixar o código limpo do GitHub sem puxar o cache antigo do Bun.

---

### 2. Configurações Recomendadas de Build (Workers & Pages):

No painel do seu projeto no Cloudflare (**Configurações / Settings** > **Builds & Deployments**):

| Campo | Valor Recomendado |
| :--- | :--- |
| **Framework preset** | `Vite` (ou `None`) |
| **Comando da build** | `npm run build` |
| **Diretório de saída (Build output directory)** | `dist` |
| **Diretório raiz (Root directory)** | `/` |

---

### 3. Variáveis de Ambiente no Cloudflare (Para Travar no Node/NPM 100%):
Em **Configurações (Settings)** > **Variáveis de ambiente (Environment variables)** > **Adicionar variável**:

- **Variável 1:**
  - **Nome:** `NODE_VERSION`
  - **Valor:** `20` (ou `22`)

- **Variável 2 (Opcional, trava a desativação do Bun):**
  - **Nome:** `NO_BUN`
  - **Valor:** `1`

---

## ✅ Pronto!
Com o cache limpo e a variável `NODE_VERSION=20`, o Cloudflare rodará com `npm install` limpo e concluirá o build com sucesso.

---

## ⚠️ Erro Específico: `npm error npm ci can only install packages...` (Falha de Binários)

### O Problema:
Ao utilizar ferramentas de compilação nativas (como TailwindCSS v4 com `@tailwindcss/oxide` ou `esbuild`), o Cloudflare Pages cancela o build imediatamente lançando erros como:
> `npm error npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.`
> `npm error Missing: @tailwindcss/oxide-darwin-arm64... from lock file`

Isso ocorre porque o arquivo `package-lock.json` gerado em um sistema específico (ex: servidor Linux) pode omitir os binários opcionais requeridos por outros sistemas. O Cloudflare, por padrão, tenta executar o comando estrito `npm ci` (Clean Install), que exige uma sincronia de 100% dos pacotes opcionais no lockfile. Ao notar a ausência desses binários, ele aborta a implantação.

### A Solução Definitiva:
1. **Apague os arquivos de Lock:** Exclua os arquivos `package-lock.json` e `bun.lock` do diretório raiz do seu projeto local.
2. **Faça um novo commit:** Faça o `commit` e o `push` dessa exclusão para o seu repositório no GitHub.
3. **Novo Comportamento Automático:** Sem encontrar o arquivo `package-lock.json` no repositório, o Cloudflare **NÃO** executará o rigoroso `npm ci`. Em vez disso, ele fará um **`npm install` padrão**, resolvendo e baixando dinamicamente apenas as dependências e binários ideais para a infraestrutura dele no momento do build. A etapa de instalação e build passará perfeitamente!
