/* ============================================================
   Yama · Supabase — Auth · Sync offline-first · Professor
   Carregado ANTES de app.js. Expõe: SB, sbAuth, sbSync, sbProf.
   ============================================================ */

/* ---- CONFIGURAÇÃO — preencha após criar o projeto em supabase.com ---- */
const SUPABASE_URL  = 'https://ybugmbnulifdptcntfdb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_CQ4asjtlNvsMkJNIZhPybg_m0hdBmK7';
/* ---------------------------------------------------------------------- */

const { createClient } = supabase;
const SB = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true },
});

/* ============================================================
   AUTH
   ============================================================ */
const sbAuth = {
  signUp: async (email, pw) => {
    const { data, error } = await SB.auth.signUp({ email, password: pw });
    if (error) throw error;
    return data; // { user, session }
  },
  signIn: async (email, pw) => {
    const { data, error } = await SB.auth.signInWithPassword({ email, password: pw });
    if (error) throw error;
    return data; // { user, session }
  },
  signOut: async () => { await SB.auth.signOut(); },
  resetPw: async (email) => {
    const { error } = await SB.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    if (error) throw error;
  },
  getSession:        ()   => SB.auth.getSession(),
  onAuthStateChange: (cb) => SB.auth.onAuthStateChange(cb),
};

/* ============================================================
   FILA OFFLINE — operações pendentes sem conexão
   ============================================================ */
const _SQ = 'yama.sync_q';
function _sqLoad(){ try{ return JSON.parse(localStorage.getItem(_SQ)||'[]'); }catch(_){ return []; } }
function _sqSave(q){ try{ localStorage.setItem(_SQ, JSON.stringify(q.slice(-200))); }catch(_){} }
function _sqPush(op){ const q=_sqLoad(); q.push({...op, _at:new Date().toISOString()}); _sqSave(q); }

/* ============================================================
   SYNC — push/pull entre DB (memória) ↔ Supabase
   ============================================================ */
let _syncBusy = false;

const sbSync = {

  _uid(){ return (typeof DB!=='undefined' && DB.sbUser) ? DB.sbUser.id : null; },
  _iso(){ return new Date().toISOString().slice(0,10); },

  /* ---- PUSH: DB → Supabase ---- */

  async pushProfile(){
    const uid = this._uid(); if(!uid) return;
    const eu = DB.eu;
    const { error } = await SB.from('profiles').upsert({
      id: uid, updated_at: new Date().toISOString(),
      apelido: eu.apelido, nome: eu.nome, nome_completo: eu.nomeCompleto,
      iniciais: eu.iniciais, faixa: eu.faixa, graus: eu.graus,
      modalidade: eu.modalidade, desde: eu.desde, foto: eu.foto,
      foco: eu.foco||[], aulas_grau_atual: eu.aulasGrau?.atual??0,
      aulas_grau_meta: eu.aulasGrau?.meta??40, aulas_graduacao: eu.aulasGraduacao??160,
      mensalidade_valor: eu.mensalidade?.valor??0,
      mensalidade_status: eu.mensalidade?.status??'ok',
      mensalidade_venc: eu.mensalidade?.venc??'—',
      jogo: DB.jogo||null, retro: DB.retro||null,
    });
    if(error) _sqPush({ type:'profile', uid });
  },

  async pushTreinos(){
    const uid = this._uid(); if(!uid || !DB.treinos.length) return;
    const rows = DB.treinos.map(t=>({
      id:t.id, user_id:uid, tipo:t.tipo, data:t.data, titulo:t.titulo,
      tecnica:t.tecnica, mood:t.mood, feel:t.feel, dia:t.dia||'', det:t.det||{},
    }));
    const { error } = await SB.from('treinos').upsert(rows, { onConflict:'id,user_id' });
    if(error) _sqPush({ type:'treinos', uid });
  },

  async pushTecProgress(){
    const uid = this._uid(); if(!uid) return;
    const rows = DB.tecnicas.map(t=>({
      user_id:uid, jp:t.jp, estado:t.estado||'aprendida', dias:t.dias||[],
      hoje_a:t.hojeA||0, hoje_t:t.hojeT||0, treinos:t.treinos||0,
      ultima:t.ultima||'—', ultima_rev:t.ultimaRev||null,
      nota:t.nota||null, nivel:t.nivel||'novo', updated_at:new Date().toISOString(),
    }));
    const { error } = await SB.from('tec_progress').upsert(rows, { onConflict:'user_id,jp' });
    if(error) _sqPush({ type:'tec_progress', uid });
  },

  async pushGraduacoes(){
    const uid = this._uid(); if(!uid) return;
    await SB.from('graduacoes').delete().eq('user_id', uid);
    if(!DB.graduacoes.length) return;
    const rows = DB.graduacoes.map(g=>({
      user_id:uid, faixa:g.faixa, graus:g.graus, tipo:g.tipo, data:g.data, por:g.por,
    }));
    await SB.from('graduacoes').insert(rows);
  },

  async pushNotas(){
    const uid = this._uid(); if(!uid) return;
    if(!DB.notas.length){ await SB.from('notas').delete().eq('user_id',uid); return; }
    const rows = DB.notas.map(n=>({ id:n.id, user_id:uid, data:n.data, texto:n.texto }));
    await SB.from('notas').upsert(rows, { onConflict:'id,user_id' });
  },

  async pushLesoes(){
    const uid = this._uid(); if(!uid) return;
    if(!DB.lesoes.length){ await SB.from('lesoes').delete().eq('user_id',uid); return; }
    const rows = DB.lesoes.map(l=>({
      id:l.id, user_id:uid, parte:l.parte, data:l.data, status:l.status, nota:l.nota,
    }));
    await SB.from('lesoes').upsert(rows, { onConflict:'id,user_id' });
  },

  async pushCheckin(){
    const uid = this._uid(); if(!uid || !DB.checkinHoje?.feito) return;
    await SB.from('check_ins').upsert(
      { user_id:uid, data:this._iso(), hora:DB.checkinHoje.hora },
      { onConflict:'user_id,data' }
    );
  },

  async trackEvent(event, props){
    const uid = this._uid(); if(!uid) return;
    try{ await SB.from('analytics_events').insert({ user_id:uid, event, props, ts:new Date().toISOString() }); }catch(_){}
  },

  /* ---- PUSH ALL ---- */
  async pushAll(){
    if(_syncBusy || !this._uid()) return;
    _syncBusy = true;
    _setSyncStatus('syncing');
    try{
      await Promise.allSettled([
        this.pushProfile(), this.pushTreinos(), this.pushTecProgress(),
        this.pushGraduacoes(), this.pushNotas(), this.pushLesoes(), this.pushCheckin(),
      ]);
      _setSyncStatus('ok');
      this._flushQueue();
    }catch(_){ _setSyncStatus('error'); }
    finally{ _syncBusy = false; }
  },

  /* ---- PULL: Supabase → DB ---- */
  async pullAll(uid){
    _setSyncStatus('syncing');
    try{
      const today = this._iso();
      const [
        { data:prof }, { data:treinos }, { data:tecProg },
        { data:grads }, { data:notas  }, { data:lesoes  }, { data:checkin },
      ] = await Promise.all([
        SB.from('profiles').select('*').eq('id', uid).single(),
        SB.from('treinos').select('*').eq('user_id', uid).order('data', { ascending:false }),
        SB.from('tec_progress').select('*').eq('user_id', uid),
        SB.from('graduacoes').select('*').eq('user_id', uid).order('data', { ascending:false }),
        SB.from('notas').select('*').eq('user_id', uid).order('data', { ascending:false }),
        SB.from('lesoes').select('*').eq('user_id', uid),
        SB.from('check_ins').select('*').eq('user_id', uid).eq('data', today).maybeSingle(),
      ]);

      if(prof){
        Object.assign(DB.eu, {
          nome:prof.nome||'', nomeCompleto:prof.nome_completo||'',
          apelido:prof.apelido||'Atleta', iniciais:prof.iniciais||'A',
          faixa:prof.faixa||'branca', graus:prof.graus||0,
          modalidade:prof.modalidade||'Jiu-Jitsu', desde:prof.desde||'',
          foto:prof.foto||null, foco:prof.foco||[],
          aulasGrau:{ atual:prof.aulas_grau_atual||0, meta:prof.aulas_grau_meta||40 },
          aulasGraduacao:prof.aulas_graduacao||160,
          mensalidade:{
            valor:+(prof.mensalidade_valor||0),
            status:prof.mensalidade_status||'ok',
            venc:prof.mensalidade_venc||'—',
          },
        });
        if(prof.role)  DB.role  = prof.role;
        if(prof.jogo)  DB.jogo  = prof.jogo;
        if(prof.retro) DB.retro = prof.retro;
        DB.onboarded = !!prof.apelido;
      }

      if(treinos) DB.treinos = treinos.map(t=>({
        id:t.id, tipo:t.tipo, data:t.data, titulo:t.titulo, tecnica:t.tecnica,
        mood:t.mood, feel:t.feel, dia:t.dia||'Hoje', det:t.det||{},
      }));

      if(tecProg){
        const map={}; tecProg.forEach(r=>{ map[r.jp]=r; });
        DB.tecnicas.forEach(t=>{
          const p=map[t.jp]; if(!p) return;
          t.estado=p.estado||'aprendida'; t.dias=p.dias||[]; t.hojeA=p.hoje_a||0;
          t.hojeT=p.hoje_t||0; t.treinos=p.treinos||0; t.ultima=p.ultima||'—';
          t.ultimaRev=p.ultima_rev||null; if(p.nota!=null) t.nota=p.nota; t.nivel=p.nivel||'novo';
        });
      }

      if(grads) DB.graduacoes = grads.map(g=>({
        faixa:g.faixa, graus:g.graus, tipo:g.tipo, data:g.data, por:g.por,
      }));
      if(notas)  DB.notas  = notas.map(n=>({ id:n.id, data:n.data, texto:n.texto }));
      if(lesoes) DB.lesoes = lesoes.map(l=>({
        id:l.id, parte:l.parte, data:l.data, status:l.status, nota:l.nota,
      }));
      if(checkin) DB.checkinHoje = { feito:true, hora:checkin.hora||null };

      _setSyncStatus('ok');
      return true;
    }catch(e){
      _setSyncStatus('error');
      console.warn('[yama:sync] pullAll:', e.message);
      return false;
    }
  },

  /* ---- Flush fila offline ---- */
  async _flushQueue(){
    const q = _sqLoad(); if(!q.length) return;
    const failed = [];
    for(const op of q){
      try{
        if(op.type==='profile')      await this.pushProfile();
        if(op.type==='treinos')      await this.pushTreinos();
        if(op.type==='tec_progress') await this.pushTecProgress();
        if(op.type==='graduacoes')   await this.pushGraduacoes();
      }catch(_){ failed.push(op); }
    }
    _sqSave(failed);
  },
};

/* ============================================================
   PROFESSOR — queries para o painel admin
   ============================================================ */
const BELT_CORES = {
  branca:'#9aa0a6', azul:'#2f6fef', roxa:'#7e4ddb', marrom:'#7a4a25', preta:'#1a1a1a',
};

const sbProf = {

  async getAlunos(){
    const today = new Date().toISOString().slice(0,10);
    const [{ data:profiles }, { data:checkins }, { data:treinos }] = await Promise.all([
      SB.from('profiles')
        .select('id,apelido,nome,iniciais,faixa,graus,mensalidade_status,mensalidade_venc,mensalidade_valor,desde')
        .eq('role','aluno'),
      SB.from('check_ins').select('user_id,hora').eq('data', today),
      SB.from('treinos').select('user_id,data').order('data', { ascending:false }),
    ]);
    const ciMap={}, ltMap={};
    (checkins||[]).forEach(c=>{ ciMap[c.user_id]=c.hora; });
    (treinos||[]).forEach(t=>{ if(!ltMap[t.user_id]) ltMap[t.user_id]=t.data; });
    return (profiles||[]).map(p=>({
      id:p.id, nm:p.apelido||p.nome||'?', ini:p.iniciais||'?',
      faixa:p.faixa||'branca', graus:p.graus||0,
      pres:ciMap[p.id]||null, pago:p.mensalidade_status||'ok',
      mensVenc:p.mensalidade_venc||'—', mensValor:+(p.mensalidade_valor||0),
      ultimoTreino:ltMap[p.id]||null, desde:p.desde||'—',
      cor:BELT_CORES[p.faixa||'branca'],
    }));
  },

  async getKPIs(){
    const [{ data:evs }, { data:treinos }, { data:alunos }, { data:pagos }] = await Promise.all([
      SB.from('analytics_events').select('event,user_id'),
      SB.from('treinos').select('user_id,data'),
      SB.from('profiles').select('id').eq('role','aluno'),
      SB.from('profiles').select('mensalidade_valor').eq('role','aluno').eq('mensalidade_status','ok'),
    ]);
    return {
      total:       (alunos||[]).length,
      ativos:      new Set((treinos||[]).map(t=>t.user_id)).size,
      treinosTotal:(treinos||[]).length,
      shares:      (evs||[]).filter(e=>e.event==='share_aberto').length,
      erros:       (evs||[]).filter(e=>e.event==='erro').length,
      receitaMes:  (pagos||[]).reduce((s,p)=>s+(+(p.mensalidade_valor||0)),0),
    };
  },

  async setMensalidade(userId, status){
    await SB.from('profiles').update({ mensalidade_status:status }).eq('id', userId);
  },

  async graduarAluno(userId, faixa, graus, tipo, por){
    const data = new Date().toISOString().slice(0,10);
    await Promise.all([
      SB.from('graduacoes').insert({ user_id:userId, faixa, graus, tipo, data, por }),
      SB.from('profiles').update({ faixa, graus }).eq('id', userId),
    ]);
  },

  async lancarPresenca(userId, hora){
    const data = new Date().toISOString().slice(0,10);
    await SB.from('check_ins').upsert(
      { user_id:userId, data, hora },
      { onConflict:'user_id,data' }
    );
  },

  async removerPresenca(userId){
    const data = new Date().toISOString().slice(0,10);
    await SB.from('check_ins').delete().eq('user_id', userId).eq('data', data);
  },
};

/* ============================================================
   SYNC STATUS DOT (UI — atualiza #sync-dot no topbar)
   ============================================================ */
function _setSyncStatus(s){
  const d = document.getElementById('sync-dot');
  if(!d) return;
  d.className = 'sync-dot sync-' + s;
  d.title = {
    syncing:'Sincronizando…',
    ok:'Sincronizado com a nuvem',
    error:'Erro de sincronização — dados salvos localmente',
    offline:'Offline — sincronizará quando reconectar',
  }[s]||'';
}
window.addEventListener('online',  ()=>{
  _setSyncStatus('syncing');
  if(typeof DB!=='undefined' && DB.sbUser) sbSync.pushAll();
});
window.addEventListener('offline', ()=> _setSyncStatus('offline'));
