import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookHeart, PlayCircle } from 'lucide-react';
import api from '../../api/axios.js';
import ShareButton from '../../Components/ShareButton.jsx';
import DownloadButton from '../../Components/DownloadButton.jsx';
import KidsLikeButton from '../../Components/children/KidsLikeButton.jsx';

export default function StoryDetail() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/content/${slug}`)
      .then((r) => setItem(r.data.data.item))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    api.get('/kids', { params: { media_type: 'bible_story', limit: 6 } })
      .then((r) => setRelated((r.data?.data?.items || []).filter((s) => s.slug !== slug)))
      .catch(() => setRelated([]));
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8EC' }}><div className="w-10 h-10 rounded-full border-4 border-orange-300 border-t-orange-500 animate-spin" /></div>;
  }
  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#FFF8EC' }}>
        <p className="text-ink/50 font-medium">We couldn't find that story.</p>
        <Link to="/kids/stories" className="px-5 py-2.5 rounded-full bg-orange-500 text-white font-bold text-sm">Back to Stories</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#FFF8EC' }}>
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <Link to="/kids/stories" className="inline-flex items-center gap-1.5 text-amber-600 font-bold text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to Stories
        </Link>

        <div className="rounded-[1.75rem] overflow-hidden shadow-xl bg-black mb-6">
          {/* No comments anywhere in this section (spec) - no comment
              count, form, or thread rendered here or anywhere else on
              this page. */}
          <video controls poster={item.thumbnail || undefined} className="w-full aspect-video bg-black" src={item.media_url} />
        </div>

        <div className="rounded-[1.75rem] bg-white shadow-lg p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink mb-1">{item.title}</h1>
              {item.bible_references && (
                <span className="inline-block text-xs font-bold text-amber-600 bg-amber-50 rounded-full px-3 py-1">{item.bible_references}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <KidsLikeButton item={item} />
              <ShareButton item={item} />
              <DownloadButton item={item} />
            </div>
          </div>
          {item.description && <p className="text-ink/70 leading-relaxed">{item.description}</p>}
        </div>

        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display font-bold text-lg text-ink mb-4">More Stories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {related.slice(0, 6).map((s) => (
                <Link key={s.id} to={`/kids/stories/${s.slug}`} className="group block rounded-2xl overflow-hidden bg-white shadow-md hover:-translate-y-1 transition-transform">
                  <div className="relative h-24 bg-gradient-to-br from-orange-200 to-amber-300">
                    {s.thumbnail ? <img src={s.thumbnail} alt="" className="w-full h-full object-contain" /> : (
                      <div className="w-full h-full flex items-center justify-center"><BookHeart className="w-6 h-6 text-white/70" /></div>
                    )}
                    <PlayCircle className="absolute bottom-1.5 right-1.5 w-5 h-5 text-white drop-shadow" />
                  </div>
                  <p className="text-xs font-bold text-ink p-2 line-clamp-1">{s.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
