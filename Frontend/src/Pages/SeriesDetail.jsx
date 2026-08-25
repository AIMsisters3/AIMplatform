import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import api from '../api/axios.js';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';

export default function SeriesDetail() {
  const { slugOrId } = useParams();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/series/${slugOrId}`)
      .then((r) => { setSeries(r.data.data.item); setEpisodes(r.data.data.episodes); })
      .catch(() => setSeries(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-24 text-ink/50">Loading series...</div>;
  if (!series) return <div className="max-w-5xl mx-auto px-6 py-24 text-ink/50">Series not found. <Link to="/series" className="text-secondary font-semibold">Back to Series</Link></div>;

  const bySeason = episodes.reduce((acc, ep) => {
    const s = ep.season_number ?? 1;
    (acc[s] = acc[s] || []).push(ep);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link to="/series" className="text-sm text-secondary font-semibold mb-6 inline-block">← Back to Series</Link>

      <div className="glass-card overflow-hidden mb-10">
        <div className="h-56 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
          {series.cover_image ? (
            <img src={series.cover_image} alt={series.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl brand-gradient-text font-display font-bold">AIM</span>
          )}
        </div>
        <div className="p-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">{series.title}</h1>
          {series.description && <p className="text-ink/70">{series.description}</p>}
        </div>
      </div>

      {Object.keys(bySeason).sort((a, b) => a - b).map((season) => (
        <div key={season} className="mb-10">
          <h2 className="font-display font-semibold text-xl mb-4">Season {season}</h2>
          <div className="space-y-3">
            {bySeason[season]
              .sort((a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0))
              .map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setActive(ep)}
                  className="w-full glass-card p-4 flex items-center gap-4 text-left hover:bg-white transition"
                >
                  <div className="w-24 h-16 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center overflow-hidden shrink-0">
                    {ep.thumbnail ? (
                      <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="w-6 h-6 text-secondary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-secondary mb-0.5">Episode {ep.episode_number}</p>
                    <h4 className="font-semibold truncate">{ep.title}</h4>
                    {ep.description && <p className="text-xs text-ink/50 line-clamp-1">{ep.description}</p>}
                  </div>
                </button>
              ))}
          </div>
        </div>
      ))}

      {active && <ContentViewerModal item={active} onClose={() => setActive(null)} />}
    </div>
  );
}
