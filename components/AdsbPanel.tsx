{/* Banner animado (webm -> gif) com altura garantida */}
<div className="mt-4">
  <div
    className="rounded-xl border border-white/10 bg-black/30 p-3"
    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
  >
    {/* Vídeo: tenta tocar; se falhar, some e o GIF aparece */}
    <video
      id="radarVideo"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className="rounded-md border border-white/10"
      style={{ width: 320, height: 180, objectFit: 'cover' }} // 16:9 fixo
      onCanPlay={() => {
        const gif = document.getElementById('radarGif');
        if (gif) gif.setAttribute('style', 'display:none');
      }}
      onError={() => {
        const vid = document.getElementById('radarVideo');
        const gif = document.getElementById('radarGif');
        if (vid) vid.setAttribute('style', 'display:none');
        if (gif) gif.setAttribute('style', 'display:block;width:320px;height:auto;border-radius:8px;border:1px solid rgba(255,255,255,.1)');
      }}
    >
      <source src="/media/radar.webm?v=9" type="video/webm" />
      {/* se o navegador não suportar webm, o <img> abaixo cobre */}
    </video>

    {/* GIF fallback (começa escondido; aparece se o vídeo falhar) */}
    <img
      id="radarGif"
      src="/media/radar.gif?v=9"
      alt="Radar animado"
      style={{ display: 'none' }}
      loading="eager"
    />
<div className="mt-4">
  <img src="/media/radar.gif?v=10" alt="teste" style={{ width: 200, height: 'auto' }} />
</div>
    {/* Links de diagnóstico (sempre visíveis) */}
    <div className="text-xs opacity-80">
      <div className="mb-1">Diagnóstico:</div>
      <div>
        <a className="underline" href="/media/radar.webm?v=9" target="_blank" rel="noopener noreferrer">
          /media/radar.webm
        </a>
        {'  '}•{'  '}
        <a className="underline" href="/media/radar.gif?v=9" target="_blank" rel="noopener noreferrer">
          /media/radar.gif
        </a>
      </div>
    </div>
  </div>
</div>
