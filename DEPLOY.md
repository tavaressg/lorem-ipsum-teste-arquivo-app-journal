# Deploy — Yama Jiu-Jitsu

App no GitHub Pages + banco no Supabase. Todo `git push main` dispara CI e publica automaticamente.

---

## Arquitetura de deploy

```
Código (HTML/JS/CSS)  →  GitHub → GitHub Pages (HTTPS)
                                        ↕
                          Supabase (banco + auth)
```

- **GitHub Pages** serve os arquivos estáticos (index.html, app.js, app.css, etc.)
- **Supabase** armazena os dados dos alunos (treinos, perfis, analytics)
- Os dois se comunicam pelo `supabase.js` no browser do aluno

---

## Setup único (primeira vez)

### 1. Supabase — criar as tabelas

1. Acesse [app.supabase.com](https://app.supabase.com) → seu projeto
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo de `schema.sql` e clique **Run**
4. Confirme que as tabelas aparecem em **Table Editor**: `profiles`, `treinos`, `tec_progress`, `graduacoes`, `notas`, `lesoes`, `check_ins`, `analytics_events`

### 2. GitHub — criar o repositório

```bash
git init
git add .
git commit -m "Yama beta — deploy inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/yama.git
git push -u origin main
```

### 3. GitHub Pages — ativar via Actions

1. No repositório: **Settings → Pages**
2. Em *Build and deployment* → **Source: GitHub Actions**
3. Salve. O próximo push já faz deploy automático.

---

## Deploy do dia a dia

```bash
# Edite os arquivos, depois:
git add .
git commit -m "descrição da mudança"
git push
```

O GitHub Actions (`.github/workflows/ci.yml`) roda automaticamente:
1. Verifica sintaxe do `app.js` e `supabase.js`
2. Valida `manifest.json`
3. Se tudo OK → publica no GitHub Pages

URL do app: `https://SEU-USUARIO.github.io/yama/`

Sempre incremente `?v=N` em `index.html` ao mudar `app.js` ou `app.css` para forçar atualização no cache dos alunos.

---

## Segurança

| Item | Status |
|---|---|
| Chave Supabase no código (`sb_publishable_`) | ✅ Seguro — é a chave pública, projetada para ficar no frontend |
| Chave Service Role (`sb_secret_`) | ❌ NUNCA commitar — bypassa toda segurança |
| Dados dos alunos no repositório | ✅ Nunca — ficam só no Supabase |
| Fotos dos alunos no repositório | ✅ Nunca — ficam no aparelho |
| `.gitignore` exclui `.claude/` e rascunhos | ✅ Configurado |

O RLS (Row Level Security) no Supabase garante que cada aluno só acessa seus próprios dados, mesmo com a chave pública exposta.

---

## Testar localmente antes de publicar

```bash
python -m http.server 5179
```
Abra `http://localhost:5179` (não `file://` — o Supabase Auth exige HTTP).

- `?demo=1` — modo vitrine, sem banco
- `?test=1` — roda os 19 asserts no console

---

## Atualizar alunos em campo

Após `git push`, os alunos recebem a versão nova na próxima vez que abrirem o app (o `?v=N` força o cache a quebrar). Dados deles ficam intactos no Supabase.
