import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlayCircle, Layers, ArrowLeft } from 'lucide-react';
import api from '../api/axios.js';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import { getItemKind } from '../utils/mediaKind.js';

const KIND_LABEL = { video: 'Watch', pdf: 'Read', audio: 'Listen', article: 'Read', image: 'View' };

export default function SeriesDetail() {
  const { slugOrId } = useParams();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [season, setSeason] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/series/${slugOrId}`)
      .then((r) => { setSeries(r.data.data.item); setEpisodes(r.data.data.episodes); setSeason(null); })
      .catch(() => setSeries(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  const bySeason = useMemo(() => episodes.reduce((acc, ep) => {
    const s = ep.season_number ?? 1;
    (acc[s] = acc[s] || []).push(ep);
    return acc;
  }, {}), [episodes]);

  const seasonNumbers = useMemo(
    () => Object.keys(bySeason).map(Number).sort((a, b) => a - b),
    [bySeason]
  );
  const activeSeason = season ?? seasonNumbers[0] ?? 1;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="h-64 rounded-xl3 bg-white/70 shadow-glass animate-pulse mb-10" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl2 bg-white/70 shadow-glass animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!series) return <div className="max-w-5xl mx-auto px-6 py-24 text-ink/50">Series not found. <Link to="/series" className="text-secondary font-semibold">Back to Series</Link></div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link to="/series" className="inline-flex items-center gap-1.5 text-sm text-secondary font-semibold mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Series
      </Link>

      <div className="relative rounded-xl3 overflow-hidden mb-10 shadow-glass">
        <div className="h-64 md:h-80 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
          {series.cover_image ? (
            <img src={series.cover_image} alt={series.title} className="w-full h-full object-cover" />
          ) : (
            <Layers className="w-14 h-14 text-secondary" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {series.category_name && (
              <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-semibold uppercase tracking-wide">
                {series.category_name}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-brand-gradient text-white text-[11px] font-semibold flex items-center gap-1">
              <PlayCircle className="w-3 h-3" /> {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
            </span>
            {seasonNumbers.length > 1 && (
              <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-semibold">
                {seasonNumbers.length} Seasons
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-2">{series.title}</h1>
          {series.description && <p className="text-white/80 text-sm md:text-base max-w-2xl line-clamp-2">{series.description}</p>}
        </div>
      </div>

      {seasonNumbers.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-6">
          {seasonNumbers.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition ${
                activeSeason === s ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white text-ink/70 border border-ink/10 hover:border-secondary/40'
              }`}
            >
              Season {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {(bySeason[activeSeason] || [])
          .sort((a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0))
          .map((ep) => {
            const kind = getItemKind(ep);
            return (
              <button
                key={ep.id}
                onClick={() => setActive(ep)}
                className="w-full glass-card p-4 flex items-center gap-4 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all group"
              >
                <span className="hidden sm:flex w-8 h-8 rounded-full bg-surface items-center justify-center text-xs font-bold text-ink/40 shrink-0">
                  {ep.episode_number}
                </span>
                <div className="relative w-28 h-20 sm:w-32 sm:h-20 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center overflow-hidden shrink-0">
                  {ep.thumbnail ? (
                    <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                  ) : (
                    <PlayCircle className="w-6 h-6 text-secondary" />
                  )}
                  <span className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors flex items-center justify-center">
                    <PlayCircle className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-secondary mb-0.5 sm:hidden">Episode {ep.episode_number}</p>
                  <h4 className="font-semibold truncate group-hover:text-secondary transition-colors">{ep.title}</h4>
                  {ep.description && <p className="text-xs text-ink/50 line-clamp-1 mt-0.5">{ep.description}</p>}
                </div>
                <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-white bg-brand-gradient px-3 py-1.5 rounded-full">
                  {KIND_LABEL[kind] || 'View'}
                </span>
              </button>
            );
          })}
      </div>

      {active && <ContentViewerModal item={active} onClose={() => setActive(null)} />}
    </div>
  );
}
