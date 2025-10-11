
'use client';
import { useState } from 'react';
export default function Admin(){
  const [msg,setMsg] = useState<string>('');
  const [tab,setTab] = useState<'rel'|'news'>('rel');
  async function submitRel(e:any){
    e.preventDefault();
    setMsg('');
    const form = e.currentTarget;
    const fd = new FormData(form);
    const csrf = document.cookie.split('; ').find(x=>x.startsWith('csrf='))?.split('=')[1] || '';
    const res = await fetch('/api/upload', { method:'POST', headers:{'x-csrf': csrf}, body: fd });
    const j = await res.json().catch(()=>({ ok:false, msg:'Erro' }));
    if(res.ok) setMsg('Relatório enviado com sucesso!');
    else setMsg(j.msg || 'Falha ao enviar relatório.');
    form.reset();
  }
  async function submitNews(e:any){
    e.preventDefault();
    setMsg('');
    const form = e.currentTarget;
    const fd = new FormData(form);
    const csrf = document.cookie.split('; ').find(x=>x.startsWith('csrf='))?.split('=')[1] || '';
    const res = await fetch('/api/admin/news', { method:'POST', headers:{'x-csrf': csrf}, body: fd });
    const j = await res.json().catch(()=>({ ok:false, msg:'Erro' }));
    if(res.ok) setMsg('Notícia cadastrada!');
    else setMsg(j.msg || 'Falha ao cadastrar notícia.');
    form.reset();
  }
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card flex items-center gap-3">
        <button className={`btn ${tab==='rel'?'border-gray-400':''}`} onClick={()=>setTab('rel')}>Enviar relatório</button>
        <button className={`btn ${tab==='news'?'border-gray-400':''}`} onClick={()=>setTab('news')}>Nova notícia</button>
        <div className="flex-1" />
        <form action="/api/admin/logout" method="post"><button className="btn">Sair</button></form>
      </div>

      {tab==='rel' && (
        <form onSubmit={submitRel} className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="hint">Mês (AAAA-MM)</label><input name="slug" placeholder="2025-10" required className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
            <div><label className="hint">Total Global (opcional)</label><input name="global" type="number" className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
          </div>
          <div><label className="hint">Título</label><input name="title" placeholder="Outubro de 2025 — ..." required className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
          <div><label className="hint">Resumo</label><textarea name="summary" rows={3} className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
          <div><label className="hint">PDF do relatório</label><input name="file" type="file" accept="application/pdf" required className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
          <button className="btn" type="submit">Enviar relatório</button>
        </form>
      )}

      {tab==='news' && (
        <form onSubmit={submitNews} className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="hint">Título</label><input name="title" required className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
            <div><label className="hint">Data</label><input name="date" type="date" required className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
          </div>
          <div><label className="hint">Link</label><input name="link" placeholder="https://..." required className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
          <div><label className="hint">URL da imagem (opcional)</label><input name="image" className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" /></div>
          <div className="flex items-center gap-2"><input id="hi" name="highlight" type="checkbox" className="scale-110" /><label htmlFor="hi" className="hint">Marcar como destaque</label></div>
          <button className="btn" type="submit">Cadastrar notícia</button>
        </form>
      )}

      {msg && <div className="card">{msg}</div>}
    </div>
  );
}
