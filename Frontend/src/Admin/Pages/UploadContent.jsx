import React, { useEffect, useState } from 'react';
import api from '../../api/axios.js';

const CONTENT_TYPES = [
  { value: 'bible_study', label: 'Bible Study' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'devotion', label: 'Devotion' },
  { value: 'news', label: 'News' },
  { value: 'gallery', label: 'Gallery' },
];

const BIBLE_STUDY_FORMATS = [
  { value: 'short_film', label: 'Short Film' },
  { value: 'video', label: 'Video' },
  { value: 'sermon', label: 'Sermon' },
  { value: 'panel', label: 'Panel Discussion' },
  { value: 'audio', label: 'Audio' },
  { value: 'animated', label: 'Animated' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'pdf_notes', label: 'PDF / Notes' },
];

export default function UploadContent() {
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', content_type: 'bible_study',
    speaker: '', bible_references: '', tags: '', language: 'English',
    visibility: 'public', status: 'draft', publish_date: '', seo_keywords: '',
    is_featured: false, allow_comments: true, body: '',
    format: 'video', study_guide_url: '',
  });
  const [categories, setCategories] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function uploadFile(file, folder) {
    const data = new FormData();
    data.append('file', file);
    data.append('folder', folder);
    const res = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url;
  }

  async function handleSave(status) {
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...form, status, category_id: form.category_id || null };

      if (thumbnailFile) payload.thumbnail = await uploadFile(thumbnailFile, 'thumbnails');
      if (videoFile) payload.media_url = await uploadFile(videoFile, 'videos');

      await api.post('/content', payload);
      setMessage(status === 'published' ? 'Content published successfully.' : 'Draft saved.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Main form */}
      <div className="xl:col-span-2 space-y-6">
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold text-lg mb-6">Upload Content</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-ink/50">Title</span>
              <input value={form.title} onChange={(e) => update('title', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-ink/50">Description</span>
              <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Content Type</span>
              <select value={form.content_type} onChange={(e) => update('content_type', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
                {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Category</span>
              <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            {form.content_type === 'bible_study' && (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-ink/50">Study Format</span>
                  <select value={form.format} onChange={(e) => update('format', e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
                    {BIBLE_STUDY_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink/50">Study Guide URL (PDF, optional)</span>
                  <input value={form.study_guide_url} onChange={(e) => update('study_guide_url', e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
                </label>
              </>
            )}

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Speaker / Author</span>
              <input value={form.speaker} onChange={(e) => update('speaker', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Bible References</span>
              <input value={form.bible_references} onChange={(e) => update('bible_references', e.target.value)}
                placeholder="e.g. John 3:16"
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Tags</span>
              <input value={form.tags} onChange={(e) => update('tags', e.target.value)}
                placeholder="comma, separated, tags"
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Language</span>
              <input value={form.language} onChange={(e) => update('language', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Visibility</span>
              <select value={form.visibility} onChange={(e) => update('visibility', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Publish Date</span>
              <input type="datetime-local" value={form.publish_date} onChange={(e) => update('publish_date', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-ink/50">SEO Keywords</span>
              <input value={form.seo_keywords} onChange={(e) => update('seo_keywords', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-ink/50">Body / Script</span>
              <textarea rows={6} value={form.body} onChange={(e) => update('body', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => update('is_featured', e.target.checked)} />
              Featured Content
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allow_comments} onChange={(e) => update('allow_comments', e.target.checked)} />
              Allow Comments
            </label>
          </div>
        </div>

        {/* Media uploads */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 text-sm">Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Upload Thumbnail</span>
              <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files[0])}
                className="mt-1 w-full text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Upload Video / Audio / PDF</span>
              <input type="file" onChange={(e) => setVideoFile(e.target.files[0])}
                className="mt-1 w-full text-sm" />
            </label>
          </div>
        </div>

        {message && <p className="text-sm text-secondary font-medium">{message}</p>}

        <div className="flex gap-3">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-6 py-3 rounded-full bg-white glass-card font-semibold text-sm disabled:opacity-60">
            Save Draft
          </button>
          <button disabled className="px-6 py-3 rounded-full bg-white glass-card font-semibold text-sm opacity-60 cursor-not-allowed">
            Preview
          </button>
          <button onClick={() => handleSave('published')} disabled={saving}
            className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass disabled:opacity-60">
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* AI Assistant side panel */}
      <div className="glass-card p-6 h-fit sticky top-24">
        <h3 className="font-semibold mb-4 flex items-center gap-2">✨ AI Assistant</h3>
        <p className="text-xs text-ink/50 mb-4">
          Generate titles, descriptions, tags, and more based on your content. Configure your OpenAI API key in Settings to enable.
        </p>
        <div className="space-y-2">
          {['Suggest Title', 'Generate Description', 'Suggest Tags', 'Bible Verse Suggestions', 'SEO Keywords', 'Grammar Check'].map((label) => (
            <button key={label} disabled className="w-full text-left px-4 py-2 rounded-xl2 bg-white/60 text-sm opacity-60 cursor-not-allowed">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
