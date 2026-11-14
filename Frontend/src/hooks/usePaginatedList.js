import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios.js';

/**
 * Shared "Load More" pagination for the simple flat-list public pages
 * (News/Gallery/Devotions) built on ContentController's own page/limit
 * params. Deliberately imperative rather than effect-driven for loadMore()
 * — a page-number-in-state + effect design double-fetches when a filter
 * changes while on page 2+ (the reset-to-page-1 effect and the fetch
 * effect both fire off the stale page number first). Here, the initial
 * page always loads via the effect below (replacing items whenever
 * `params` changes); loadMore() is a plain callback the caller wires to a
 * button's onClick, appending exactly once per click with no extra state
 * roundtrip.
 */
export function usePaginatedList(endpoint, params, limit = 24) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let active = true;
    pageRef.current = 1;
    setLoading(true);
    api.get(endpoint, { params: { ...params, page: 1, limit } })
      .then((r) => {
        if (!active) return;
        const newItems = r.data?.data?.items || [];
        setItems(newItems);
        setHasMore(newItems.length === limit);
      })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, limit]);

  const loadMore = useCallback(() => {
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    api.get(endpoint, { params: { ...params, page: nextPage, limit } })
      .then((r) => {
        const newItems = r.data?.data?.items || [];
        pageRef.current = nextPage;
        setItems((prev) => [...prev, ...newItems]);
        setHasMore(newItems.length === limit);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, limit]);

  return { items, loading, loadingMore, hasMore, loadMore };
}
