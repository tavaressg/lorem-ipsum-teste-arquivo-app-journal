# CONTRIBUTING.md — Como contribuir no Yama Jiu-Jitsu

---

## Regras do projeto

### Restricoes absolutas
1. **NUNCA edite `yama-offline.html`** — gerado por `build_offline.py`, so regenerar quando pedir "organizar"
2. **Judo + BJJ = uma arte** — sem graduacao dupla, sem separar modulos
3. **Persistencia = localStorage** — sem backend ate decidir Supabase
4. **Codigo de presenca = 0000** — fixo nesta fase
5. **FEEDBACK_URL** — nao alterar sem pedir

### Fluxo de trabalho
1. Alterar `app.js` e/ou `app.css`
2. Testar no preview (localhost ou preview server)
3. Incrementar `?v=N` em `index.html` (app.js e app.css)
4. Validar com `?test=1` (19 asserts devem passar)
5. Verificar console limpo (0 erros)
6. Commitar e push

### Convencoes de codigo
- Funcoes/variaveis em ingles, strings de UI em portugues
- Nomenclatura de tecnicas sempre em japones (`jp`)
- Minimo de comentarios — so `/* === SECAO === */` para estrutura
- Sheets seguem o pattern: `sheet-overlay > sheet` com grip
- Empty states: toda view trata 0 dados com mensagem + CTA
- `dayChartNode()`: sempre 30 slots fixos
- Faixa font: sempre `var(--ink)` (nunca a cor da faixa)

### Design
- Norte-visual: iOS-clean (MoneyMgr + Runna + Strava/Hevy)
- Fundo `#f4f4f6`, cards brancos, UM accent vermelho `--red`
- Verde calmo `--good` para positivos
- Dark theme suportado via CSS variables

### Antes de entregar
- [ ] `?test=1` → 19/19 OK
- [ ] Console sem erros
- [ ] Empty states funcionam (testar com `localStorage.clear()` + reload)
- [ ] DEMO mode funciona (`?demo=1`)
- [ ] `?v=N` incrementado em `index.html`
