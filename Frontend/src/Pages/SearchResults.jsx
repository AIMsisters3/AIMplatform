import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ProductCard from '../Components/ProductCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState({ content: [], products: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults({ content: [], products: [] });
      return;
    }
    setLoading(true);
    api.get('/search', { params: { q, limit: 24 } })
      .then((r) => setResults({ content: r.data.data.content, products: r.data.data.products }))
      .catch(() => setResults({ content: [], products: [] }))
      .finally(() => setLoading(false));
  }, [q]);

  const totalResults = results.content.length + results.products.length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Search Results</h1>
      <p className="text-ink/60 mb-10">
        {q ? <>Showing results for <span className="font-semibold text-ink">"{q}"</span></> : 'Enter a search term to get started.'}
      </p>

      {loading ? (
        <p className="text-ink/50">Searching...</p>
      ) : q.trim().length < 2 ? (
        <div className="glass-card p-10 text-center text-ink/50">
          <SearchIcon className="w-10 h-10 mx-auto text-ink/20 mb-3" />
          Type at least 2 characters to search.
        </div>
      ) : totalResults === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">
          No results found for "{q}". Try a different search term.
        </div>
      ) : (
        <div className="space-y-12">
          {results.content.length > 0 && (
            <section>
              <h2 className="font-display font-semibold text-xl mb-5">Content ({results.content.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {results.content.map((item) => <ContentCard key={`c-${item.id}`} item={item} onClick={() => setActive(item)} />)}
              </div>
            </section>
          )}

          {results.products.length > 0 && (
            <section>
              <h2 className="font-display font-semibold text-xl mb-5">Shop ({results.products.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {results.products.map((p) => <ProductCard key={`p-${p.id}`} product={p} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {active && <ContentViewerModal item={active} onClose={() => setActive(null)} />}
    </div>
  );
}
