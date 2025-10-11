
import YouTubeEmbed from '@/components/YouTubeEmbed';
import Image from 'next/image';

export default function LuzesPage() {
  return (
    <div className="space-y-8">
      <section className="card">
        <div className="flex items-center gap-4">
          <Image src="/images/MiniaturaLUZESABISMO.jpg" alt="Luzes do Abismo" width={80} height={80} className="rounded-lg border border-gray-700" />
          <div>
            <h1 className="text-2xl font-semibold">Luzes do Abismo — YouTube</h1>
            <p className="hint">Análises, casos e discussões sobre UAP/OVNI. Siga o canal para novidades semanais.</p>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Vídeo de apresentação</h2>
          <YouTubeEmbed id="CJEKzSll76g" title="Apresentação do canal" />
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Banner</h2>
          <div className="relative w-full h-64 overflow-hidden rounded-xl border border-gray-800">
            <Image src="/images/uapsovinisemar2024cover.jpeg" alt="Banner Luzes do Abismo" fill className="object-cover" />
          </div>
          <a className="btn mt-3 inline-block" href="https://www.youtube.com/@LuzesAbismo" target="_blank" rel="noreferrer">Abrir no YouTube</a>
        </div>
      </section>
    </div>
  );
}
