# AGENTS.md — Convenções IT Booster pra este projeto

> Template copiado de `tools/catalog/template-projeto/AGENTS.md` no monorepo ItBoosterEmpresa.
> Mantenha as 4 primeiras seções intactas (são convenções globais). Adicione regras específicas do projeto na seção final.

## 1. Credenciais

Toda credencial (API key, senha, token, URL de serviço) vive em `~/.Codex/credentials/services.env` no laptop do dev e nos secrets do GitHub Actions / runtime de produção. **Nunca commitar `.env` real.** Use `.env.example` no repo apontando os nomes das variáveis.

Ao adicionar credencial nova: atualiza `services.env` global primeiro, depois `.env.example` aqui.

## 2. Catálogo IT Booster

Antes de propor integração com outro produto, ler o catálogo:
- `docs/catalogo/PROJETOS.md` no monorepo [`ItBoosterEmpresa`](https://github.com/inael/ItBoosterEmpresa/blob/master/docs/catalogo/PROJETOS.md).
- Ao criar projeto novo IT Booster, **adicionar `.itbooster-meta.yaml` na raiz** (template em `tools/catalog/template-projeto/.itbooster-meta.yaml`).
- Action diária regenera o catálogo automaticamente — não precisa atualizar à mão.

## 3. Git authoring

Todo commit em repos IT Booster (incluindo este) usa:

```bash
git commit --author="inael <inael.rodrigues@gmail.com>" -m "..."
```

Razão: a conta `inaelitbooster` (autor padrão do git config) **não é membro do team Vercel "IT Booster"** — commits dela bloqueiam deploys com "Deployment Blocked".

## 4. Status dashboard

Toda URL pública nova (`*.itbooster.com.br`, `*.toolpad.cloud`, dominios próprios) deve ser cadastrada em [`https://status.toolpad.cloud/`](https://status.toolpad.cloud/) (HTML em `/docker/dashboard/html/index.html` na VPS).

## 5. Garantia / Manutenção (apenas projetos de cliente)

Modelo padrão IT Booster:
- 2h grátis pós-entrega (ajustes + bugs)
- Evoluções cobradas por hora (acordar valor antes)

## 6. Narrativa "Hub de IA" em propostas

Em propostas comerciais nunca revelar LiteLLM/provedores específicos. Vender "acesso ao Hub de IA IT Booster" — só mostrar os modelos efetivamente usados.

## 7. Dados do cliente nunca na infra IT Booster

Backups, banco e arquivos de cliente sempre no storage pago pelo próprio cliente (Drive/Dropbox/VPS dele). VPS IT Booster é só pra produtos próprios.

---

## Regras específicas deste projeto

<!-- Adicione aqui o que é único deste projeto: stack peculiar, decisões arquiteturais, gotchas, comandos úteis, etc. -->

- Stack: ...
- Comandos:
  - `npm run dev` — sobe local
  - `npm run build` — build produção
- Decisões importantes:
  - ...

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
