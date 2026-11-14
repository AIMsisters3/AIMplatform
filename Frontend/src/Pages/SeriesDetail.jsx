import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlayCircle, Layers, ArrowLeft, Headphones, FileText } from 'lucide-react';
import api from '../api/axios.js';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import { getItemKind } from '../utils/mediaKind.js';

const KIND_LABEL = { video: 'Watch', pdf: 'Read', audio: 'Listen', article: 'Read', image: 'View' };

// Bible Study series only (migration 039 narrowed bible_studies.format
// to exactly these two) - a book like Daniel can have its chapters
// available as both, so this asks which one to browse before showing
// any episodes, rather than mixing audio and PDF chapters into one list.
const FORMAT_CHOICES = {
  audio: { label: 'Audio', icon: Headphones },
  pdf: { label: 'PDF', icon: FileText },
};

export default function SeriesDetail() {
  const { slugOrId } = useParams();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [season, setSeason] = useState(null);
  // null = not chosen yet. Only ever relevant for a bible_study series
  // with episodes in more than one format - see the effect below, which
  // skips the question entirely (auto-picks) when there's only one.
  const [chosenFormat, setChosenFormat] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/series/${slugOrId}`)
      .then((r) => { setSeries(r.data.data.item); setEpisodes(r.data.data.episodes); setSeason(null); setChosenFormat(null); })
      .catch(() => setSeries(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  const isBibleStudySeries = series?.section === 'bible_study';

  const availableFormats = useMemo(() => {
    if (!isBibleStudySeries) return [];
    const found = new Set();
    episodes.forEach((ep) => {
      const kind = getItemKind(ep);
      if (kind === 'audio' || kind === 'pdf') found.add(kind);
    });
    // FORMAT_CHOICES' own key order (audio, then pdf), not Set insertion
    // order, which would otherwise depend on which episode happens to be
    // first in the list.
    return Object.keys(FORMAT_CHOICES).filter((f) => found.has(f));
  }, [episodes, isBibleStudySeries]);

  // Nothing to ask when there's only one format present - jump straight
  // to its episode list, same as a series with just one format never
  // showed a picker before this existed.
  useEffect(() => {
    if (isBibleStudySeries && availableFormats.length === 1) {
      setChosenFormat(availableFormats[0]);
    }
  }, [isBibleStudySeries, availableFormats]);

  const formatFilteredEpisodes = useMemo(() => {
    if (!isBibleStudySeries || !chosenFormat) return episodes;
    return episodes.filter((ep) => getItemKind(ep) === chosenFormat);
  }, [episodes, isBibleStudySeries, chosenFormat]);

  const needsFormatChoice = isBibleStudySeries && availableFormats.length > 1 && !chosenFormat;

  const bySeason = useMemo(() => formatFilteredEpisodes.reduce((acc, ep) => {
    const s = ep.season_number ?? 1;
    (acc[s] = acc[s] || []).push(ep);
    return acc;
  }, {}), [formatFilteredEpisodes]);

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
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 break-words">{series.title}</h1>
          {series.description && <p className="text-white/80 text-sm md:text-base max-w-2xl line-clamp-2">{series.description}</p>}
        </div>
      </div>

      {needsFormatChoice ? (
        <div className="py-6">
          <h2 className="text-xl font-display font-bold text-ink text-center mb-1">How would you like to study {series.title}?</h2>
          <p className="text-ink/50 text-sm text-center mb-8">Choose a format - you can switch anytime.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            {availableFormats.map((fmt) => {
              const { label, icon: Icon } = FORMAT_CHOICES[fmt];
              const count = episodes.filter((ep) => getItemKind(ep) === fmt).length;
              return (
                <button
                  key={fmt}
                  onClick={() => setChosenFormat(fmt)}
                  className="glass-card p-8 flex flex-col items-center gap-3 text-center hover:-translate-y-1 hover:shadow-lg transition-all group"
                >
                  <span className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center group-hover:bg-brand-gradient transition-colors">
                    <Icon className="w-7 h-7 text-secondary group-hover:text-white transition-colors" />
                  </span>
                  <span className="font-display font-bold text-lg text-ink">{label}</span>
                  <span className="text-xs text-ink/50">{count} {count === 1 ? 'chapter' : 'chapters'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {seasonNumbers.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
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
            {isBibleStudySeries && availableFormats.length > 1 && (
              <button
                onClick={() => setChosenFormat(null)}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
              >
                {(() => {
                  const Icon = FORMAT_CHOICES[chosenFormat]?.icon;
                  return Icon ? <Icon className="w-3.5 h-3.5" /> : null;
                })()}
                Switch format
              </button>
            )}
          </div>

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
                        <img src={ep.thumbnail} alt={ep.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
        </>
      )}

      {active && <ContentViewerModal item={active} onClose={() => setActive(null)} />}
    </div>
  );
}
