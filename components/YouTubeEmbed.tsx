
export default function YouTubeEmbed({ id }: { id: string }){
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[color:var(--border)] shadow-glow">
      <div style={{paddingTop:'56.25%'}} />
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
