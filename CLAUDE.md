# CLAUDE.md — Yama Jiu-Jitsu

> Este arquivo e carregado automaticamente pelo Claude Code em toda sessao nova.
> Contem tudo que o agente precisa para trabalhar neste projeto sem perguntar.

---

## Documentacao complementar

Para detalhes alem deste arquivo, consulte:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — arquitetura completa: diagramas de fluxo, arvore de roteamento, separacao catalogo/usuario, decisoes arquiteturais com alternativas rejeitadas, pontos de atencao para manutencao, glossario
- **[BETA.md](BETA.md)** — playbook do beta fechado: hipotese, perfil dos testers, KPIs (ativacao/funil/retencao/engajamento/churn), criterios de sucesso, coleta de dados, priorizacao P0/P1/P2, governanca LGPD
- **[DEPLOY.md](DEPLOY.md)** — guia passo a passo para GitHub Pages: seguranca (repo publico), checklist pre-deploy, como atualizar durante o teste
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — regras de contribuicao, convencoes de codigo/design, checklist de entrega

---

## O que e

Diario de treino digital para Jiu-Jitsu e Judo (tratados como **uma arte so** — Judo Kodokan, Kosen e BJJ). SPA vanilla JS, sem framework, sem backend, sem npm. Dados ficam no `localStorage` do aparelho do aluno.

**Fase:** beta fechado (max 5 alunos, 18+, sem servidor).

---

## Regras inviolaveis

1. **NUNCA edite `yama-offline.html`**. Ele e gerado por `build_offline.py`. So regenerar quando o usuario pedir "organizar".
2. **Judo + BJJ = uma arte**. Sem graduacao dupla. Sem separar "modulo judo" e "modulo bjj".
3. **localStorage e a persistencia escolhida**. Sem backend ate o usuario decidir migrar para Supabase.
4. **FEEDBACK_URL = `https://wa.me/5531996248909?text=`**. Nao alterar sem pedir.
5. **Codigo de presenca = `0000`**. Fixo nesta fase.
6. **Todas as alteracoes no preview primeiro**, nunca direto no offline.
7. **`app.js?v=N`** — incrementar `v` em `index.html` a cada mudanca para furar cache.

---

## Stack

| Camada | Tech |
|---|---|
| Frontend | Vanilla JS (SPA unica em `app.js` ~2950 linhas) |
| Estilo | CSS puro (`app.css`), CSS variables (light + dark) |
| Fonte | Montserrat self-hosted (woff2 base64 em `fonts.css`) |
| Persistencia | `localStorage['yama.v1']` com `__schema:1` |
| PWA | `manifest.json` (standalone, portrait) — sem service worker |
| Deploy | GitHub Pages (HTTPS) |
| CI | GitHub Actions: `node --check app.js` + manifest validation |
| Testes | `selfTest()` interno (19 asserts), trigger `?test=1` |
| Analytics | 100% local em `DB.analytics.events` (cap 1000), exportavel no JSON |

**Zero dependencias externas.** Sem npm, sem CDN, sem framework.

---

## Estrutura de arquivos

```
CLAUDE.md               ← este arquivo (carregado automaticamente)
index.html              ← entry point (carrega app.js + app.css com ?v=N)
app.js                  ← SPA completa (estado, logica, views, boot)
app.css                 ← estilos globais
fonts.css               ← @font-face Montserrat (base64)
manifest.json           ← PWA manifest
logo.png                ← icone 192px
yama-logo.png           ← logo principal / maskable
fonts/                  ← Montserrat woff2 (400-800)
ARCHITECTURE.md         ← documentacao tecnica detalhada
BETA.md                 ← playbook beta (KPIs, LGPD, governanca)
DEPLOY.md               ← guia GitHub Pages + seguranca
CONTRIBUTING.md         ← regras de contribuicao
.gitignore              ← exclui .claude/, scripts dev, rascunhos
.github/workflows/ci.yml ← CI (syntax + manifest)
```

**Excluidos do git:** `.claude/`, `build_offline.py`, `yama-offline.html`, `rascunho-foco.html`, `logo-original.png`.

---

## Arquitetura do app.js

O arquivo segue uma ordem fixa. Conhecer essa ordem e essencial para navegar:

```
Linha ~1-40      Utilitarios ($, el, meses, DEMO, hoje, BELTS, beltMini)
Linha ~41-210    DB (seed do estado: academia, eu, treinos, tecnicas, etc.)
Linha ~214-240   Migracao (FOCO_INICIAL, gerarDias, DB.links, DB.analytics)
Linha ~242-298   Persistencia (STORE_KEY, save, load, aplicarCleanSlate)
Linha ~300-380   Analytics (track, betaKPIs, abrirMetricas)
Linha ~382-550   Renshu helpers (nivelDe, focoTecnicas, registroBody, salvar)
Linha ~554-567   Roteador render()
Linha ~568-1060  Views do Aluno (inicio, jornada, heatmap, frequencia)
Linha ~1060-1290 Detalhe treino + Share (drawStory, renderShare)
Linha ~1293-1460 Tatame (renshu, progresso, biblioteca, analise)
Linha ~1460-2500 Progresso, Biblioteca, Graduacao, Perfil, Presenca, Loja
Linha ~2507-2560 Onboarding + Politica LGPD
Linha ~2595-2700 Ajuda, Editar Perfil, Configuracoes, Feedback
Linha ~2700-2900 Editar Foco, Sistemas, Lesoes, Export, Notificacoes, Limpar
Linha ~2895-2920 selfTest()
Linha ~2922-2951 Boot (DEMO vs Real) + Splash
```

> Para diagramas de roteamento e fluxo de dados detalhados, veja [ARCHITECTURE.md](ARCHITECTURE.md) secoes 4.2 e 4.3.

---

## Modelo de dados (objeto DB)

### Persistido (USER_KEYS)
- `eu` — perfil (apelido, nome, faixa, graus, foto, foco, consentimento)
- `treinos` — array de treinos (id, tipo, data, titulo, det com contadores renshu)
- `graduacoes` — timeline faixa/graus
- `checkinHoje` — {feito, hora}
- `semana` — {feitos, meta, streakSemanas, dias[7]} (recalculado dinamicamente)
- `notas`, `lesoes`, `notificacoes` — listas simples
- `jogo` — scouting report (estilo, radar, metas)
- `retro` — retrospectiva anual
- `analytics` — {events[]} cap 1000

### Catalogo (sempre do codigo, nunca salvo)
- `academia`, `professor`, `tecnicaDoDia` — dados da academia
- `tecnicas` (27) — 5 nage + 6 osaekomi + 3 shime + 3 kansetsu + 10 kosen
- `sistemas` (3), `loja`, `alunos` (mock professor)

### Progresso por tecnica (TEC_PROG, salvo em mapa `tecProg[jp]`)
`estado`, `dias[]`, `hojeA`, `hojeT`, `treinos`, `ultima`, `ultimaRev`, `nota`, `nivel`

**Nivel dinamico** via `nivelDe(t)`: 0=novo, 1-4=aprendendo, 5-11=treinando, 12+=dominada.

---

## Padroes do codigo

### Helpers globais
- `$(sel, el?)` — querySelector
- `el(html)` — cria elemento DOM de template string
- `render()` — roteador principal, recria toda a UI. Wrapeado com `scheduleSave()` no boot real.
- `toast(msg)` — notificacao temporaria
- `track(evento, props)` — analytics local (no-op em DEMO)

### Fluxo de dados
```
Mutacao no DB → render() → scheduleSave() → save() apos 400ms
```
Nao ha reatividade. `render()` destroi e recria o DOM do `#root` a cada chamada.

### Modo DEMO vs Real
- `?demo=1` → `DEMO=true`: data congelada 2026-06-03, seed rico, nao carrega/salva
- Sem flag → `DEMO=false`: `hoje=new Date()`, carrega localStorage, clean-slate se 1o acesso

### Navegacao
```
DB.navAluno = 'inicio' | 'jogo' | 'jornada' | 'perfil'
DB.jogoTab = 'renshu' | 'progresso' | 'biblioteca' | 'analise'
DB.jornadaTab = 'historico' | 'frequencia' | 'graduacao'
```
Flags modais: `DB.onboardingOpen`, `DB.shareOpen`, `DB.presencaOpen`, `DB.treinoAberto`, `DB.flow`, `DB.lojaOpen`, `DB.retroOpen`.

### Catalogo vs Dados pessoais (separacao critica)
O catalogo de tecnicas vem SEMPRE do codigo (27 tecnicas com jp/pt/cat/oficial). O progresso pessoal e salvo num mapa `tecProg[jp]` e re-aplicado no boot via `load()`. Isso permite editar o curriculo sem zerar o diario dos alunos.

---

## Convencoes

- **Lingua:** funcoes/variaveis em ingles, UI em portugues
- **Nomenclatura tecnicas:** sempre em japones (`jp`) como chave primaria
- **Design:** iOS-clean. Fundo `#f4f4f6`, cards brancos, UM accent vermelho `--red`, verde calmo `--good`
- **Faixa:** `beltMini(faixa, graus, largura, altura)` — corpo colorido + ponteira preta com gradiente
- **Fonte da faixa:** sempre `var(--ink)` (nao a cor da faixa, por contraste na branca)
- **Graficos:** `dayChartNode()` sempre 30 slots fixos, placeholders vazios para dias sem dados
- **Empty states:** toda view trata 0 treinos com mensagem + CTA
- **Comentarios:** minimos, so secoes estruturais `/* === SECAO === */`
- **Sheets:** pattern `sheet-overlay > sheet` com grip, close via click fora ou botao

> Para checklist de entrega e regras de design completas, veja [CONTRIBUTING.md](CONTRIBUTING.md).

---

## O que NAO alterar sem pedir

1. `yama-offline.html` — gerado, nao editavel
2. `FEEDBACK_URL` — numero pessoal do usuario
3. `STORE_KEY` / `SCHEMA` — quebra persistencia dos testers
4. Seed do DEMO (DB.eu, DB.treinos) — usado para demonstracao
5. `aplicarCleanSlate()` — limpa dados pessoais preservando catalogo
6. Estrutura do onboarding (consent 18+ obrigatorio, LGPD)
7. `selfTest()` — manter os 19 asserts funcionando

---

## Eventos de analytics instrumentados

`app_open`, `onboarding_done`, `treino_registrado`, `foco_add`, `presenca`, `nota`, `revisao`, `share_aberto`, `export`, `feedback`, `ajuda`, `erro`

---

## Roadmap pos-beta

1. Backend Supabase (auth email+senha, sync, analytics agregado)
2. Visao do Professor (presenca oficial, graduacao, financeiro)
3. Loja/pagamento real + check-in QR
4. Acessibilidade completa + i18n
5. Service worker para offline real

> Para KPIs, criterios de sucesso e governanca LGPD do beta, veja [BETA.md](BETA.md).

---

## Como testar

- `?demo=1` — modo vitrine com dados ricos
- `?test=1` — roda selfTest(), resultado em console e `window.__selfTest`
- CI: `node --check app.js` + validacao manifest
- Preview: start server, registrar treino, recarregar, verificar persistencia

> Para deploy e checklist de seguranca, veja [DEPLOY.md](DEPLOY.md).
