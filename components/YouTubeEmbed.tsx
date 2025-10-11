export default function YouTubeEmbed({
  id,
  title = 'YouTube video',
  className = '',
}: {
  id: string;
  title?: string;      // <- aceita title opcional
  className?: string;  // <- (extra) permite estilização opcional
}) {
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-[color:var(--border)] ${className}`}>
      <div style={{ paddingTop: '56.25%' }} />
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed/${id}`}
        title={title}  // <- agora o title é aceito
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
