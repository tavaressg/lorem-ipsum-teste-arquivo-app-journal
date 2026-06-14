# ARCHITECTURE.md — Yama Jiu-Jitsu

> Documentacao tecnica completa da arquitetura. Para contexto rapido do Claude Code, veja `PROJECT_CONTEXT.md`.

---

## 1. Objetivo do sistema

Diario de treino digital para praticantes de Jiu-Jitsu e Judo (arte unica: Judo Kodokan + Kosen + BJJ). O aluno registra treinos em ~15 segundos, acompanha progresso por tecnica, streak de consistencia e caminho de graduacao. O progresso visivel (graficos, card de story) e o motor de retencao.

**Hipotese validando no beta:** registro < 20s + progresso visivel = aluno volta a registrar espontaneamente (>=3x/semana sem lembrete).

---

## 2. Tecnologias

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Linguagem | Vanilla JS (ES2020+) | Zero build step, deploy = copiar arquivos |
| Estilos | CSS puro + CSS custom properties | Theming light/dark sem preprocessador |
| Tipografia | Montserrat (woff2 base64 self-hosted) | Sem CDN, sem falha de rede |
| Persistencia | `localStorage` (`yama.v1`) | Sem backend, cada aparelho = um aluno |
| PWA | `manifest.json` (standalone) | "Adicionar a Tela de Inicio" no iOS/Android |
| Hosting | GitHub Pages | HTTPS gratuito, necessario para APIs web |
| CI | GitHub Actions | Syntax check + manifest validation |
| Analytics | Eventos locais exportaveis | Sem servidor, dados viajam no JSON de backup |

**Dependencias externas: nenhuma.** Sem npm, CDN, framework ou servico de terceiros.

---

## 3. Estrutura de diretorios

```
Claude-JiuJitsu/
├── index.html              # Entry point
│   ├── app.css?v=54        # Estilos globais
│   └── app.js?v=66         # SPA completa (~2950 linhas)
│
├── app.js                  # Estado + logica + views + boot
├── app.css                 # Light/dark theme, componentes, animacoes
├── fonts.css               # @font-face Montserrat (base64 inlined)
├── manifest.json           # PWA: standalone, portrait, icones
│
├── logo.png                # Icone 192px (apple-touch-icon)
├── yama-logo.png           # Logo principal (fallback + maskable)
├── fonts/                  # Montserrat woff2 weights 400-800
│   ├── montserrat-400.woff2
│   ├── montserrat-500.woff2
│   ├── montserrat-600.woff2
│   ├── montserrat-700.woff2
│   └── montserrat-800.woff2
│
├── PROJECT_CONTEXT.md      # Contexto para Claude Code (este repo)
├── ARCHITECTURE.md         # Documentacao tecnica (este arquivo)
├── DEPLOY.md               # Guia de deploy GitHub Pages + seguranca
├── BETA.md                 # Playbook beta (KPIs, LGPD, governanca)
│
├── .gitignore              # Exclui dev files do repositorio publico
└── .github/workflows/
    └── ci.yml              # node --check + manifest validation

    (excluidos do git — .gitignore)
├── build_offline.py        # Gera yama-offline.html
├── yama-offline.html       # Versao offline compilada (NAO editar)
├── rascunho-foco.html      # Rascunho de UI
├── logo-original.png       # Logo fonte (nao publicar)
└── .claude/                # Config local do Claude Code
```

---

## 4. Arquitetura do app.js

### 4.1 Organizacao em blocos sequenciais

O arquivo e monolitico e segue uma ordem fixa:

```
[A] UTILITARIOS       (~1-40)    $, el, DEMO, hoje, BELTS, beltMini
[B] ESTADO (DB)       (~41-210)  Seed completo: academia, eu, treinos, tecnicas
[C] MIGRACAO          (~214-240) FOCO_INICIAL, gerarDias, DB.links, DB.analytics
[D] PERSISTENCIA      (~242-298) save, load, aplicarCleanSlate
[E] ANALYTICS         (~300-380) track, betaKPIs, abrirMetricas
[F] RENSHU HELPERS    (~382-550) nivelDe, focoTecnicas, registroBody, salvar
[G] ROTEADOR          (~554-567) render() — ponto unico de re-renderizacao
[H] VIEWS ALUNO       (~568-1060) inicio, jornada, heatmap, frequencia
[I] SHARE             (~1060-1290) drawStory (canvas), renderShare
[J] TATAME            (~1293-1460) renshu, progresso, biblioteca, analise
[K] DETALHES          (~1460-2500) graduacao, perfil, presenca, loja
[L] ONBOARDING/LGPD   (~2507-2615) onboarding, politica, ajuda
[M] CONFIG            (~2617-2900) editar perfil, config, feedback, export, limpar
[N] SELF-TEST         (~2895-2920) 19 asserts smoke
[O] BOOT              (~2922-2951) DEMO vs Real, splash
```

### 4.2 Padrao de estado e renderizacao

```
              ┌──────────────────────────────┐
              │         DB (objeto JS)        │
              │  Estado compartilhado global  │
              └──────────┬───────────────────┘
                         │ mutacao direta
                         ▼
              ┌──────────────────────────────┐
              │          render()             │
              │  Destroi #root e recria DOM  │
              │  Chama atualizarSemana()     │
              │  Roteia por flags modais     │
              └──────────┬───────────────────┘
                         │ via wrapper
                         ▼
              ┌──────────────────────────────┐
              │       scheduleSave()          │
              │  Debounce 400ms → save()     │
              │  Serializa USER_KEYS + tecProg│
              │  → localStorage['yama.v1']   │
              └──────────────────────────────┘
```

**Nao ha reatividade.** `render()` e chamado apos cada mutacao e reconstroi a UI inteira. E simples mas funciona para o tamanho atual.

### 4.3 Roteamento (render)

```
render()
  ├── atualizarSemana()         (recalcula streak/semana dos treinos reais)
  ├── if onboardingOpen  → renderOnboarding()
  ├── if retroOpen       → renderRetro()
  ├── if presencaOpen    → renderPresenca()
  ├── if lojaOpen        → renderLoja()
  ├── if shareOpen       → renderShare()
  ├── if treinoAberto    → renderTreinoDetalhe()
  ├── if flow            → renderFlow()
  ├── if role=aluno      → renderAluno()
  │     ├── inicio       → alunoInicio()
  │     ├── jogo         → alunoMeuJogo()
  │     │     ├── renshu     → evoluirRenshu()
  │     │     ├── progresso  → evoluirProgresso()
  │     │     ├── biblioteca → evoluirBiblioteca()
  │     │     └── analise    → evoluirAnalise()
  │     ├── jornada      → alunoJornada()
  │     │     ├── historico  → jornadaHistorico() + heatmapCard()
  │     │     ├── frequencia → jornadaFrequencia()
  │     │     └── graduacao  → evoluirGraduacao()
  │     └── perfil       → alunoPerfil()
  └── if role=professor  → renderProfessor()   (desativado no beta)
```

### 4.4 Persistencia — separacao catalogo/usuario

```
CODIGO (seed, imutavel)          LOCALSTORAGE (mutavel)
┌────────────────────┐           ┌────────────────────────┐
│ tecnicas[27]       │           │ yama.v1                │
│  jp, pt, cat,      │           │  __schema: 1           │
│  oficial           │           │  onboarded: true       │
│                    │           │  eu: {...}             │
│ sistemas[3]        │           │  treinos: [...]        │
│ academia           │           │  graduacoes: [...]     │
│ professor          │           │  semana: {...}         │
│ loja               │           │  analytics: {events[]} │
│ BELTS, CATS        │           │  tecProg: {            │
└────────────────────┘           │    "Hadaka-jime": {    │
         │                       │      estado, dias[],   │
         │ boot: load()          │      treinos, ultima   │
         │ aplica tecProg        │    }, ...              │
         ▼                       │  }                     │
┌────────────────────┐           └────────────────────────┘
│ DB (em memoria)    │
│  catalogo + estado │
│  unificado         │
└────────────────────┘
```

**Beneficio:** atualizar o curriculo de tecnicas no codigo nao zera o diario dos alunos. Tecnicas novas entram sem progresso; tecnicas removidas perdem o progresso salvo (aceitavel).

---

## 5. Fluxos principais

### 5.1 Primeiro acesso
```
1. Boot: load() retorna false (sem save)
2. aplicarCleanSlate(): zera eu, treinos, graduacoes, tecnicas (progresso)
3. DB.onboarded = false → DB.onboardingOpen = true
4. renderOnboarding(): apelido + faixa + checkbox 18+ (LGPD)
5. Ao clicar "Comecar": salva consentimento, cria graduacao inicial
6. abrirAjuda(true): mini-guia 1a vez
7. render() → alunoInicio() com diario vazio
```

### 5.2 Registro de treino
```
1. Inicio: CTA "Registrar presenca" → renderPresenca() (codigo 0000)
2. Inicio: CTA "Registrar treino" → registroBody()
3. Pergunta 1: Fez randori? (sim/nao)
4. Se sim: cards Renshu (deu certo / nao deu certo por tecnica em foco)
5. Nota rapida (opcional)
6. Avaliacao 1-5 (obrigatorio)
7. salvar():
   - Cria treino em DB.treinos com HOJE_ISO
   - Atualiza progresso das tecnicas (dias[], treinos++, ultima)
   - Marca checkinHoje se nao feito
   - track('treino_registrado')
   - Abre renderShare() automaticamente
```

### 5.3 Compartilhamento
```
1. drawStory(): renderiza canvas 1080x1920
2. 6 templates: resumo, acerto, streak, checkin, marca, kanji
3. Opcao foto (camera/galeria): _cover() aplica sobre card translucido
4. 3 saidas:
   - navigator.share() → abre sheet nativo (Instagram direto)
   - ClipboardItem(Promise) → copia PNG (iOS-safe)
   - canvas.toBlob() → download PNG
```

### 5.4 Exportacao
```
1. Config → Exportar meus dados
2. Monta JSON: eu (minimal), treinos, tecnicas (progresso), kpis, analytics
3. Copiar JSON ou baixar arquivo .json
4. Tester manda no grupo WhatsApp semanalmente
```

---

## 6. Regras de negocio

### Tecnicas
- 27 tecnicas no catalogo, organizadas em 5 categorias: nage (quedas), osaekomi (imobilizacoes), shime (estrangulamentos), kansetsu (chaves), kosen (guarda/jogo por baixo)
- Nomenclatura sempre em japones (`jp`) como chave primaria
- Nivel dinamico: `nivelDe(t)` calcula de `t.treinos` (0=novo, 1-4=aprendendo, 5-11=treinando, 12+=dominada)
- Maximo 3 tecnicas em foco simultaneo

### Streak e semana
- `semanaStats()`: deriva de treinos reais, nao hardcoded
- Semana = seg-dom. Streak conta semanas com >=1 treino
- `_attendedSet()`: Set memoizado de datas com treino + checkin de hoje

### Graduacao
- `paceSemanal()`: media de treinos/semana desde o primeiro treino
- `paceMensal()`: paceSemanal * 4.345
- Estimativa = aulas restantes / pace
- Faixa font sempre `var(--ink)` (contraste na branca)

### Presenca
- Codigo fixo: 0000 (teclado OTP de 4 digitos)
- `checkinHoje.feito` determina o estado do CTA na Inicio

### LGPD
- Consentimento obrigatorio no onboarding (checkbox 18+, gates "Comecar")
- Dados minimos: sem CPF, email, senha nesta fase
- Direitos: acessar (export), corrigir (editar), apagar (limpar)
- Politica acessivel em Config e no onboarding

---

## 7. Integracoes externas

**Atualmente: nenhuma.** O app e 100% client-side.

### APIs do navegador utilizadas
| API | Uso | Restricao |
|---|---|---|
| `localStorage` | Persistencia de dados | Apagado se limpar browser. iOS priva em file:// |
| `navigator.clipboard.write` | Copiar PNG do share card | Requer HTTPS + gesto do usuario. ClipboardItem com Promise para iOS |
| `navigator.share` | Compartilhamento nativo | So mobile, feature-detected |
| `canvas.toBlob` | Renderizar share card | — |
| `FileReader.readAsDataURL` | Foto de perfil e share | — |

### Integracoes futuras planejadas
1. **Supabase** — auth email+senha, sync entre aparelhos, analytics agregado
2. **Garmin Connect MCP** — servidor MCP local como assistente de treinador

---

## 8. Variaveis de ambiente e constantes

Nao ha `.env` nem variaveis de ambiente. Tudo e constante no codigo:

| Constante | Valor | Onde |
|---|---|---|
| `STORE_KEY` | `'yama.v1'` | app.js ~249 |
| `SCHEMA` | `1` | app.js ~250 |
| `FEEDBACK_URL` | `'https://wa.me/5531996248909?text='` | app.js ~252 |
| `META_CAP` | `70` | app.js ~386 — teto da linha de meta |
| `DEMO` | `URLSearchParams.has('demo')` | app.js ~13 |
| `HOJE_ISO` | `isoOf(hoje)` | app.js ~16 — data real ou congelada |

---

## 9. Dependencias criticas

| Dependencia | Risco | Mitigacao |
|---|---|---|
| `localStorage` | Apagado ao limpar browser/dados | Export semanal + nota em Config |
| GitHub Pages | Repo publico expoe fonte | .gitignore + DEPLOY.md com checklist |
| HTTPS | Obrigatorio para clipboard/share/localStorage iOS | GitHub Pages fornece |
| Safari/iOS | ClipboardItem precisa de Promise sincrona no gesto | Pattern implementado |
| Montserrat | Fonte unica | Self-hosted base64, sem CDN |

---

## 10. Decisoes arquiteturais

| Decisao | Alternativa rejeitada | Justificativa |
|---|---|---|
| SPA vanilla JS monolitica | React/Vue/Svelte | Zero build, deploy = copiar, prototipacao rapida |
| `render()` recria DOM inteiro | Virtual DOM / diffing | Simples, performante para o tamanho atual (~3k linhas) |
| `DB` objeto global | Redux/Zustand/signals | Estado compartilhado direto, sem boilerplate |
| Catalogo no codigo | Catalogo no localStorage | Permite atualizar curriculo sem resetar diarios |
| localStorage sem backend | Supabase/Firebase | Valida hipotese sem custo de infra |
| `scheduleSave()` via render wrapper | Chamadas explicitas de save | Garante que toda mutacao visivel salva automaticamente |
| Canvas para share card | HTML2Canvas / SVG | Controle pixel-perfect, funciona offline |
| Montserrat base64 | Google Fonts CDN | Offline-first, sem dependencia de rede |

---

## 11. Pontos de atencao para manutencao

### Performance
- `render()` destroi e recria todo o DOM. Se o app crescer muito (>100 tecnicas, >500 treinos), considerar diffing parcial.
- `_attendedSet()` e memoizado por signature — invalidar corretamente se mudar o pattern.
- `DB.analytics.events` tem cap de 1000. Se precisar mais, o export ja reseta.

### Fragilidade
- **Inline onclick handlers** em template strings (ex: `onclick="fecharRetro()"`). Funcoes precisam estar no escopo global. Preferir `el().onclick = fn` nos novos codigos.
- **IDs duplicados** potenciais em sheets (ex: `#ep-save`). Sheets sao removidas antes de reabrir, mas cuidado ao ter duas abertas.
- **`app.js` monolitico** — dificil de navegar >2950 linhas. Organizacao por blocos sequenciais mitiga, mas refactor em modulos e um candidato pos-beta.

### Seguranca
- **Repo publico**: `FEEDBACK_URL` com numero pessoal esta no fonte. Alertar em DEPLOY.md.
- **Sem sanitizacao de HTML**: `el(html)` injeta direto. Dados do usuario (apelido, notas) vao para template strings. Risco de XSS se o aluno inserir `<script>`. Mitigacao: `textContent` para dados do usuario onde possivel.
- **localStorage acessivel por JS**: qualquer script no mesmo dominio le os dados. Como nao ha scripts de terceiros, risco e baixo.

### Compatibilidade
- **iOS Safari**: `ClipboardItem` precisa de `new Promise(res => canvas.toBlob(res))` chamado sincronamente no gesto — nao mover para async/await.
- **`localStorage` no iOS**: unreliable em modo privado e file://. Requer HTTPS.
- **`zoom:.92`** em `.phone`: hack de escala para caber em telas menores. Pode causar problemas com coordenadas de toque em alguns dispositivos.

---

## 12. Como rodar

### Desenvolvimento (local)
```bash
python -m http.server 5179
# Abrir http://localhost:5179
# Demo: http://localhost:5179?demo=1
# Testes: http://localhost:5179?test=1
```

### Deploy (GitHub Pages)
Ver `DEPLOY.md` para guia completo. Resumo:
1. Criar repo publico no GitHub
2. Upload dos arquivos do app (nao subir .claude/ nem rascunhos)
3. Settings → Pages → Deploy from branch: main
4. Incrementar `?v=N` em index.html a cada atualizacao

### Testes
- `?test=1` → `selfTest()` roda 19 asserts (funcoes puras + render de todas as abas)
- Resultado em `console` e `window.__selfTest`
- CI: `node --check app.js` (sintaxe) + `node -e "JSON.parse(...)"` (manifest)

---

## 13. Glossario

| Termo | Significado |
|---|---|
| **Renshu** | Pratica deliberada — registro de "deu certo / nao deu certo" por tecnica |
| **Foco** | Ate 3 tecnicas que o aluno esta praticando ativamente |
| **Arsenal** | Tecnicas com acerto acima da media (confiavel no randori) |
| **Streak** | Semanas consecutivas com pelo menos 1 treino |
| **Clean-slate** | Estado inicial de um aluno novo (catalogo cheio, diario vazio) |
| **DEMO** | Modo vitrine (`?demo=1`) com dados ricos e data congelada |
| **Nage-waza** | Tecnicas de projecao/queda (judo em pe) |
| **Osaekomi-waza** | Tecnicas de imobilizacao (controle no chao) |
| **Shime-waza** | Estrangulamentos |
| **Kansetsu-waza** | Chaves articulares |
| **Kosen** | Estilo de judo focado em ne-waza (chao), ponte entre judo e jiu-jitsu |
