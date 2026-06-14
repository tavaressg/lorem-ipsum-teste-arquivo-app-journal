# Yama Jiu-Jitsu — Playbook do Beta Fechado

Documento operacional do beta. Define perfil, hipótese, KPIs, critérios de sucesso, coleta de dados, priorização e governança (LGPD). Beta **fechado, sem backend, local-only, maiores de 18**.

---

## 1. Hipótese nº1 (a validar)
> No fim da aula, o aluno registra o treino em **< 20s**; e, por causa do progresso visível (streak + % por técnica + card de story), **volta a registrar espontaneamente** (≥3 registros na 1ª semana) — e esse hábito gera o *"quero usar oficialmente"*.

**Sub-hipóteses / falsificação**
- Fricção baixa → falha se tempo médio de registro > 40s ou reclamam de "trabalhoso".
- Progresso motiva retorno → falha se < 3 de 5 registram ≥3x/semana **sem lembrete**.
- Card de story gera orgulho → falha se ninguém compartilha espontaneamente.

## 2. Perfil & tamanho dos testers
- **5 alunos** que você conhece, recrutados pessoalmente.
- **Maiores de 18** (restrição do beta — evita consentimento parental).
- Mix recomendado: 3 faixas diferentes (branca/azul/+), 1–2 que treinam pouco (testar estados vazios/streak 0).
- Duração: **2–3 semanas**.

## 3. KPIs — definições
| KPI | Definição | Onde medir |
|---|---|---|
| **Ativação** | Registrou ≥1 treino | `kpis.ativado` / painel "Métricas do beta" |
| **Funil** | abriu → onboarding → 1º treino → 3º treino → compartilhou | `kpis.funil` |
| **Retenção D1** | Teve atividade no dia seguinte ao 1º uso | `kpis.retencaoD1` |
| **Retenção D7** | Teve atividade entre o dia 1 e o dia 7 | `kpis.retencaoD7` |
| **Engajamento** | Média de treinos por semana | `kpis.treinosPorSemana` |
| **Churn (risco)** | Dias desde o último treino | `kpis.diasSemTreinar` |
| **Estabilidade** | Nº de erros capturados | `kpis.erros` / eventos `erro` |

## 4. Critérios de sucesso (operacionaliza "valeu a pena")
- **≥4 de 5** dizem *"quero continuar usando oficialmente"* (perguntar no fim), **E**
- **≥3 de 5** registram **≥3 treinos/semana sem lembrete**, **E**
- **0 bug P0** em aberto no fechamento.

## 5. Coleta de dados (sem backend)
- Cada tester usa o app normalmente. Tudo fica no aparelho dele.
- **1×/semana**: peça que cada um vá em **Config → Exportar meus dados** e mande o JSON no grupo de WhatsApp.
- Você **agrega os 5 JSONs**: cada um traz `kpis`, `analytics.events` (com `erro`) e os treinos. Some/compare na mão (ou cole numa planilha).
- O tester também vê os próprios números em **Config → Métricas do beta**.

## 6. Priorização de bugs & feedback
| Nível | O que é | SLA (alvo) |
|---|---|---|
| **P0 — Crítico** | Trava o uso, perde dados, não abre, não salva | **24h** / hotfix imediato |
| **P1 — Alto** | Fluxo principal com falha, número errado, confunde | Dentro da semana |
| **P2 — Médio** | Cosmético, melhoria, "seria bom ter" | Backlog / pós-beta |

**Processo:** feedback chega no grupo (WhatsApp) → você + 1 pessoa triam por nível → P0/P1 viram correção (eu implemento no preview → bump `?v=` → redeploy) → avisa o tester. Decisão de produto fica com você.

## 7. Governança de dados (LGPD)
- **Controlador:** Academia Yama Jiu-Jitsu (responsável: você).
- **Dados tratados:** apelido, faixa/grau, treinos, técnicas, notas, lesões, data de consentimento e eventos de uso. **Sem** CPF, endereço, e-mail ou senha nesta fase.
- **Onde ficam:** exclusivamente no `localStorage` do aparelho do usuário. **Não há servidor.** Só sai do aparelho o que o usuário exporta e envia.
- **Base legal:** consentimento (registrado no onboarding — `eu.consentimento`).
- **Minimização:** coletamos só o necessário para o diário e o beta.
- **Retenção:** os dados ficam até o usuário apagar (**Config → Apagar todos os dados**). Ao fim do beta, oriente exportar ou apagar.
- **Direitos do titular:** acesso/portabilidade (Exportar), correção (Editar perfil), exclusão (Apagar tudo). Solicitações: botão **Enviar feedback**.
- **Segurança:** sem servidor (superfície mínima); transporte via HTTPS (GitHub Pages); sem decisões automatizadas.
- **Menores:** fora do escopo do beta (somente 18+).

## 8. Roadmap pós-beta (ordem)
1. **Backend (Supabase): e-mail+senha + recuperação + sync** — destrava "usar oficialmente", backup automático e analytics agregado. (~R$0/mês no início, ~1–2 semanas.)
2. Visão do Professor (presença oficial, graduação, financeiro).
3. Loja/pagamento real; check-in por QR/totem.
4. Acessibilidade completa (auditoria com leitor de tela) e i18n.

---

### Apêndice — eventos instrumentados
`app_open`, `onboarding_done`, `treino_registrado`, `foco_add`, `presenca`, `nota`, `revisao`, `share_aberto`, `export`, `feedback`, `ajuda`, `erro`.
Rodar o smoke test: abrir a URL com `?test=1` (resultado no console e em `window.__selfTest`).
