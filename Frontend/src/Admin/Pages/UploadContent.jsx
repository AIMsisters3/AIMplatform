import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios.js';
import Dropzone from '../Components/upload/Dropzone.jsx';
import RichTextEditor from '../Components/upload/RichTextEditor.jsx';
import TagInput from '../Components/upload/TagInput.jsx';
import {
  Video, Film, Mic, Headphones, FileText, Image as ImageIcon, FileType, BookOpen,
  Clapperboard, Palette, Wand2, Users, MessageSquare, Camera, Music2, Podcast,
  Newspaper, BookHeart, Images, ChevronDown, ChevronUp, Loader2, CheckCircle2,
  AlertCircle, Sparkles, ArrowLeft,
} from 'lucide-react';

// ---------------------------------------------------------------------
// What are you uploading? Each card maps directly onto (section, media_type)
// as validated server-side in ContentController::SECTION_MEDIA_TYPES — this
// is a friendlier presentation of that same pairing, not a parallel system.
// Bible Study gets one card here; its specific study format is chosen via a
// secondary "Study Type" field once selected, same as the rest of the CMS.
// ---------------------------------------------------------------------
const CONTENT_TYPES = [
  { key: 'video', label: 'Video', icon: Video, section: 'media_library', media_type: 'video', group: 'primary' },
  { key: 'short_film', label: 'Short Film', icon: Film, section: 'media_library', media_type: 'short_film', group: 'primary' },
  { key: 'sermon', label: 'Sermon', icon: Mic, section: 'media_library', media_type: 'sermon', group: 'primary' },
  { key: 'audio', label: 'Audio', icon: Headphones, section: 'media_library', media_type: 'audio', group: 'primary' },
  { key: 'article', label: 'Article', icon: FileText, section: 'media_library', media_type: 'article', group: 'primary' },
  { key: 'image', label: 'Image', icon: ImageIcon, section: 'media_library', media_type: 'image', group: 'primary' },
  { key: 'pdf', label: 'PDF', icon: FileType, section: 'media_library', media_type: 'pdf', group: 'primary' },
  { key: 'bible_study', label: 'Bible Study', icon: BookOpen, section: 'bible_study', media_type: 'video', group: 'primary' },

  { key: 'movie', label: 'Movie', icon: Clapperboard, section: 'media_library', media_type: 'movie', group: 'more' },
  { key: 'cartoon', label: 'Cartoon', icon: Palette, section: 'media_library', media_type: 'cartoon', group: 'more' },
  { key: 'animation', label: 'Animation', icon: Wand2, section: 'media_library', media_type: 'animation', group: 'more' },
  { key: 'panel', label: 'Panel Discussion', icon: Users, section: 'media_library', media_type: 'panel', group: 'more' },
  { key: 'interview', label: 'Interview', icon: MessageSquare, section: 'media_library', media_type: 'interview', group: 'more' },
  { key: 'documentary', label: 'Documentary', icon: Camera, section: 'media_library', media_type: 'documentary', group: 'more' },
  { key: 'music', label: 'Music', icon: Music2, section: 'media_library', media_type: 'music', group: 'more' },
  { key: 'podcast', label: 'Podcast', icon: Podcast, section: 'media_library', media_type: 'podcast', group: 'more' },
  { key: 'news_article', label: 'News Article', icon: Newspaper, section: 'news', media_type: 'news_article', group: 'more' },
  { key: 'devotional', label: 'Devotional', icon: BookHeart, section: 'devotions', media_type: 'devotional', group: 'more' },
  { key: 'photo_gallery', label: 'Photo Gallery', icon: Images, section: 'gallery', media_type: 'photo_gallery', group: 'more' },
];

const BIBLE_STUDY_TYPES = [
  { value: 'short_film', label: 'Short Film' },
  { value: 'video', label: 'Video' },
  { value: 'sermon', label: 'Sermon' },
  { value: 'panel', label: 'Panel Discussion' },
  { value: 'audio', label: 'Audio' },
  { value: 'animated', label: 'Animated' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'pdf_notes', label: 'PDF / Notes' },
];

// Mirrors ContentController::BODY_REQUIRED_MEDIA_TYPES exactly.
const BODY_REQUIRED_MEDIA_TYPES = ['article', 'news_article', 'devotional'];

// What kind of main-media control to show for a given media_type. `null`
// means "no separate main file" — Article/News/Devotional use the rich
// text body instead, and Photo Gallery (today: a single content row, one
// cover image — see README §9 for the planned album/multi-image follow-up)
// reuses the Cover Image field as its one photo rather than asking for the
// same image twice.
function mediaKindFor(mediaType) {
  if (BODY_REQUIRED_MEDIA_TYPES.includes(mediaType)) return 'article';
  if (mediaType === 'photo_gallery') return null;
  if (mediaType === 'image') return 'image';
  if (mediaType === 'pdf' || mediaType === 'pdf_notes') return 'document';
  if (['audio', 'music', 'podcast'].includes(mediaType)) return 'audio';
  return 'video';
}

// Mirrors Backend/config/config.php's ALLOWED_*_TYPES / MAX_UPLOAD_SIZE_MB.
// This is only a friendly early check — the server re-validates extension,
// real file content (MIME sniffing), and size regardless of what the
// client claims, and that's the check that actually matters.
const MEDIA_RULES = {
  video: { accept: '.mp4,.mov,.webm', hint: 'MP4, MOV, WEBM · up to 100MB', folder: 'videos', extensions: ['mp4', 'mov', 'webm'] },
  audio: { accept: '.mp3,.wav,.ogg', hint: 'MP3, WAV, OGG · up to 100MB', folder: 'audio', extensions: ['mp3', 'wav', 'ogg'] },
  document: { accept: '.pdf', hint: 'PDF only · up to 100MB', folder: 'documents', extensions: ['pdf'] },
  image: { accept: '.jpg,.jpeg,.png,.gif,.webp', hint: 'JPG, PNG, GIF, WEBP · up to 100MB', folder: 'general', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
};
const THUMBNAIL_RULE = { accept: '.jpg,.jpeg,.png,.gif,.webp', hint: 'JPG, PNG, WEBP', folder: 'thumbnails', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] };
const MAX_UPLOAD_MB = 100;

const MEDIA_KIND_ICON = { video: Video, audio: Headphones, document: FileType, image: ImageIcon };

const SECTION_DESTINATION = {
  media_library: 'Content / Media Library',
  news: 'News',
  gallery: 'Gallery',
  bible_study: 'Bible Study',
  devotions: 'Devotions',
};

const emptyUpload = { file: null, previewUrl: null, uploadedUrl: null, uploading: false, progress: 0, error: null };

const DEFAULT_FORM = {
  title: '', description: '', body: '', transcript: '',
  category_id: '', language: 'en',
  tags: '', seo_keywords: '',
  visibility: 'public', status: 'draft',
  publish_date: '', publish_time: '',
  is_featured: false, allow_comments: true,
  study_guide_url: '',
  series_id: '', season_number: '1', episode_number: '',
  media_type_bible_study: 'video',
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${
        checked ? 'bg-brand-gradient' : 'bg-ink/15'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink/50">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {hint && <span className="block text-[11px] text-ink/40 -mt-0.5 mb-1">{hint}</span>}
      <div className={hint ? '' : 'mt-1'}>{children}</div>
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-red-500 mt-1 font-medium">
          <AlertCircle className="w-3 h-3" /> {error}
        </span>
      )}
    </label>
  );
}

const inputClass = (hasError) =>
  `w-full px-4 py-2.5 rounded-xl2 border ${hasError ? 'border-red-300' : 'border-ink/10'} focus:outline-none focus:ring-2 focus:ring-secondary bg-white`;

export default function UploadContent() {
  const navigate = useNavigate();

  const [selectedKey, setSelectedKey] = useState('video');
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [showSeo, setShowSeo] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [thumbnail, setThumbnail] = useState(emptyUpload);
  const [media, setMedia] = useState(emptyUpload);

  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [seriesList, setSeriesList] = useState([]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null); // { slug, viewHref, published }

  const selectedType = CONTENT_TYPES.find((t) => t.key === selectedKey) || CONTENT_TYPES[0];
  const section = selectedType.section;
  const isBibleStudy = section === 'bible_study';
  const isGallery = section === 'gallery';
  const mediaType = isBibleStudy ? form.media_type_bible_study || 'video' : selectedType.media_type;
  const mediaKind = mediaKindFor(mediaType);
  const requiresBody = mediaKind === 'article';
  const showSeries = mediaKind === 'video' || mediaKind === 'audio';

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
    api.get('/languages')
      .then((r) => setLanguages(r.data?.data?.items || []))
      .catch(() => setLanguages([]));
    api.get('/series', { params: { status: 'all', limit: 100 } })
      .then((r) => setSeriesList(r.data?.data?.items || []))
      .catch(() => setSeriesList([]));
  }, []);

  // Switching what's being uploaded changes which main-media control (if
  // any) applies — drop a file picked for a now-irrelevant kind rather
  // than silently carrying it into the new submission.
  useEffect(() => {
    setMedia(emptyUpload);
  }, [mediaKind]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function selectType(key) {
    setSelectedKey(key);
    setErrors((e) => ({ ...e, type: undefined }));
  }

  async function uploadWithProgress(file, folder, setState) {
    setState((s) => ({ ...s, uploading: true, progress: 0, error: null }));
    const data = new FormData();
    data.append('file', file);
    data.append('folder', folder);
    try {
      const res = await api.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setState((s) => ({ ...s, progress: Math.round((evt.loaded / evt.total) * 100) }));
        },
      });
      const url = res.data.data.url;
      setState((s) => ({ ...s, uploading: false, progress: 100, uploadedUrl: url }));
      return url;
    } catch (err) {
      setState((s) => ({ ...s, uploading: false, error: err.response?.data?.message || 'The file could not be uploaded.' }));
      return null;
    }
  }

  function validateAndPick(file, rule, setState) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!rule.extensions.includes(ext)) {
      setState((s) => ({ ...s, error: `That file type isn't supported. Use: ${rule.hint.split('·')[0].trim()}` }));
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setState((s) => ({ ...s, error: `File exceeds the ${MAX_UPLOAD_MB}MB limit.` }));
      return;
    }
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setState({ ...emptyUpload, file, previewUrl });
    uploadWithProgress(file, rule.folder, setState);
  }

  function removeUpload(setState) {
    setState(emptyUpload);
  }

  function validate({ forPublish }) {
    const next = {};
    if (!form.title.trim()) next.title = 'Please enter a title.';

    if (forPublish) {
      if (!form.category_id) next.category_id = 'Please select a category.';
      if (!isGallery && !form.language) next.language = 'Please select a language.';

      if (requiresBody) {
        const plain = form.body.replace(/<[^>]*>/g, '').trim();
        if (!plain) next.body = 'Please write the article body.';
      } else if (mediaKind && !media.uploadedUrl) {
        const label = mediaKind === 'video' ? 'a video' : mediaKind === 'audio' ? 'an audio file' : mediaKind === 'document' ? 'a PDF' : 'an image';
        next.media = `Please upload ${label}.`;
      } else if (mediaKind === null && !thumbnail.uploadedUrl) {
        next.thumbnail = 'Please upload an image for this gallery item.';
      }

      if (form.status === 'scheduled' && !form.publish_date) {
        next.publish_date = 'Please choose a publish date.';
      }
      if (showSeries && form.series_id && !form.episode_number) {
        next.episode_number = 'Please enter an episode number.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPayload(status) {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      section,
      media_type: mediaType,
      category_id: form.category_id || null,
      language: isGallery ? null : (form.language || null),
      tags: form.tags || null,
      seo_keywords: form.seo_keywords.trim() || null,
      visibility: form.visibility,
      status,
      is_featured: form.is_featured,
      allow_comments: form.allow_comments,
      thumbnail: thumbnail.uploadedUrl || null,
      media_url: mediaKind === null ? (thumbnail.uploadedUrl || null) : (media.uploadedUrl || null),
      body: requiresBody ? form.body : null,
      transcript: !requiresBody && mediaKind ? (form.transcript.trim() || null) : null,
    };

    if (isBibleStudy) {
      payload.study_guide_url = form.study_guide_url.trim() || null;
    }
    if (status === 'scheduled' && form.publish_date) {
      payload.publish_date = `${form.publish_date}T${form.publish_time || '00:00'}:00`;
    }

    return payload;
  }

  function viewHrefFor(sectionValue, slug) {
    switch (sectionValue) {
      case 'bible_study': return `/bible-studies/${slug}`;
      case 'media_library': return `/content?item=${slug}`;
      case 'news': return '/news';
      case 'gallery': return '/gallery';
      case 'devotions': return '/devotions';
      default: return '/content';
    }
  }

  async function handleSubmit(targetStatus) {
    setSubmitError('');
    const forPublish = targetStatus !== 'draft';
    if (!validate({ forPublish })) return;

    setSubmitting(true);
    try {
      const payload = buildPayload(targetStatus);
      const { data } = await api.post('/content', payload);
      const newId = data.data.id;

      if (showSeries && form.series_id) {
        await api.post(`/series/${form.series_id}/episodes`, {
          content_id: newId,
          season_number: Number(form.season_number || 1),
          episode_number: Number(form.episode_number || 1),
        });
      }

      // Confirms the row genuinely persisted (not just that the POST
      // returned 201) and gets the slug the create response doesn't include.
      const confirm = await api.get(`/content/${newId}`);
      const slug = confirm.data?.data?.item?.slug;

      setResult({
        slug,
        viewHref: slug ? viewHrefFor(section, slug) : null,
        published: targetStatus !== 'draft',
        scheduled: targetStatus === 'scheduled',
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Something went wrong while saving. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedKey('video');
    setShowMoreTypes(false);
    setShowSeo(false);
    setForm(DEFAULT_FORM);
    setThumbnail(emptyUpload);
    setMedia(emptyUpload);
    setErrors({});
    setSubmitError('');
    setResult(null);
  }

  function handleCancel() {
    const hasContent = form.title || form.description || form.body;
    if (hasContent && !window.confirm('Discard this unsaved content?')) return;
    navigate('/admin/content');
  }

  // ---------------------------------------------------------------------
  // Success state — replaces the form entirely once a save completes, per
  // spec: don't silently redirect, give the admin a clear next step.
  // ---------------------------------------------------------------------
  if (result) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-display font-semibold text-xl text-ink mb-2">
          {result.scheduled ? 'Content scheduled successfully.' : result.published ? 'Content published successfully.' : 'Draft saved successfully.'}
        </h2>
        <p className="text-sm text-ink/50 mb-8">
          {result.published ? `It's live in ${SECTION_DESTINATION[section]}.` : "You'll find it in Manage Content under Drafts."}
        </p>
        <div className="flex justify-center gap-3">
          {result.viewHref && (
            <Link to={result.viewHref} className="px-6 py-3 rounded-full bg-white glass-card font-semibold text-sm">
              View Content
            </Link>
          )}
          <button onClick={resetForm} className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass">
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <p className="text-xs text-ink/40 mb-2">
          <Link to="/admin" className="hover:text-secondary">Dashboard</Link>
          <span className="mx-1.5">/</span>
          <Link to="/admin/content" className="hover:text-secondary">Content</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink/60">Upload Content</span>
        </p>
        <h1 className="font-display font-semibold text-xl text-ink">Upload Content</h1>
        <p className="text-sm text-ink/50 mt-0.5">Add a new resource to the AIMsisters media library.</p>
      </div>

      {/* What are you uploading? */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">What are you uploading?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONTENT_TYPES.filter((t) => t.group === 'primary').map((t) => (
            <TypeCard key={t.key} type={t} active={selectedKey === t.key} onClick={() => selectType(t.key)} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowMoreTypes((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-secondary mt-4"
        >
          {showMoreTypes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showMoreTypes ? 'Fewer types' : 'More types'}
        </button>

        {showMoreTypes && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {CONTENT_TYPES.filter((t) => t.group === 'more').map((t) => (
              <TypeCard key={t.key} type={t} active={selectedKey === t.key} onClick={() => selectType(t.key)} />
            ))}
          </div>
        )}

        <p className="text-[11px] text-ink/35 mt-4">
          This will appear in <span className="font-semibold text-ink/50">{SECTION_DESTINATION[section]}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Content Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <Field label="Content Title" required error={errors.title}>
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="The Power of Prayer"
                className={inputClass(errors.title) + ' text-base py-3'}
              />
            </Field>

            <Field label="Description" hint="A short summary — used on cards, search results, and previews.">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Write a short description of this content..."
                className={inputClass(false) + ' rounded-2xl'}
              />
            </Field>

            {requiresBody ? (
              <Field label="Article Content" required error={errors.body}>
                <RichTextEditor
                  value={form.body}
                  onChange={(v) => update('body', v)}
                  placeholder="Write the full article..."
                />
              </Field>
            ) : mediaKind ? (
              <Field label="Transcript / Notes (optional)" hint="The uploaded media is the primary content — this is just an optional transcript or study notes.">
                <textarea
                  rows={3}
                  value={form.transcript}
                  onChange={(e) => update('transcript', e.target.value)}
                  className={inputClass(false) + ' rounded-2xl'}
                />
              </Field>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category" required error={errors.category_id}>
                <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className={inputClass(errors.category_id)}>
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              {isGallery ? (
                <Field label="Language">
                  <input disabled value="Not applicable" readOnly className={inputClass(false) + ' bg-ink/5 text-ink/40'} />
                </Field>
              ) : (
                <Field label="Language" required error={errors.language}>
                  <select value={form.language} onChange={(e) => update('language', e.target.value)} className={inputClass(errors.language)}>
                    <option value="">Select language...</option>
                    {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </Field>
              )}
            </div>

            {isBibleStudy && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Study Type">
                  <select
                    value={mediaType}
                    onChange={(e) => update('media_type_bible_study', e.target.value)}
                    className={inputClass(false)}
                  >
                    {BIBLE_STUDY_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Study Guide URL (PDF, optional)">
                  <input
                    value={form.study_guide_url}
                    onChange={(e) => update('study_guide_url', e.target.value)}
                    placeholder="https://..."
                    className={inputClass(false)}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Media */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-ink">Media</h3>

            <Field label={isGallery ? 'Cover Image' : 'Cover Image / Thumbnail'} error={errors.thumbnail}>
              <Dropzone
                icon={ImageIcon}
                title="image"
                acceptHint={THUMBNAIL_RULE.hint}
                accept={THUMBNAIL_RULE.accept}
                kind="image"
                file={thumbnail.file}
                previewUrl={thumbnail.previewUrl}
                uploadedUrl={thumbnail.uploadedUrl}
                uploading={thumbnail.uploading}
                progress={thumbnail.progress}
                error={thumbnail.error}
                onSelect={(f) => validateAndPick(f, THUMBNAIL_RULE, setThumbnail)}
                onRemove={() => removeUpload(setThumbnail)}
                compact
              />
            </Field>

            {mediaKind && mediaKind !== 'article' && (
              <Field
                label={mediaKind === 'video' ? 'Upload Video' : mediaKind === 'audio' ? 'Audio File' : mediaKind === 'document' ? 'Document' : 'Upload Image'}
                required
                error={errors.media}
              >
                <Dropzone
                  icon={MEDIA_KIND_ICON[mediaKind]}
                  title={mediaKind === 'video' ? 'video' : mediaKind === 'audio' ? 'audio' : mediaKind === 'document' ? 'PDF' : 'image'}
                  acceptHint={MEDIA_RULES[mediaKind].hint}
                  accept={MEDIA_RULES[mediaKind].accept}
                  kind={mediaKind}
                  file={media.file}
                  previewUrl={media.previewUrl}
                  uploadedUrl={media.uploadedUrl}
                  uploading={media.uploading}
                  progress={media.progress}
                  error={media.error}
                  onSelect={(f) => validateAndPick(f, MEDIA_RULES[mediaKind], setMedia)}
                  onRemove={() => removeUpload(setMedia)}
                />
              </Field>
            )}
          </div>

          {/* Series */}
          {showSeries && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-ink">Series</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Series">
                  <select value={form.series_id} onChange={(e) => update('series_id', e.target.value)} className={inputClass(false)}>
                    <option value="">No Series</option>
                    {seriesList.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </Field>
                {form.series_id && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Season">
                      <input type="number" min="1" value={form.season_number} onChange={(e) => update('season_number', e.target.value)} className={inputClass(false)} />
                    </Field>
                    <Field label="Episode #" required error={errors.episode_number}>
                      <input type="number" min="1" value={form.episode_number} onChange={(e) => update('episode_number', e.target.value)} className={inputClass(errors.episode_number)} />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="glass-card p-6 space-y-2">
            <span className="text-xs font-semibold text-ink/50">Tags</span>
            <TagInput value={form.tags} onChange={(v) => update('tags', v)} />
          </div>

          {/* SEO / Discovery */}
          <div className="glass-card p-6">
            <button type="button" onClick={() => setShowSeo((v) => !v)} className="flex items-center justify-between w-full text-left">
              <span className="text-sm font-semibold text-ink">Search &amp; Discovery</span>
              {showSeo ? <ChevronUp className="w-4 h-4 text-ink/40" /> : <ChevronDown className="w-4 h-4 text-ink/40" />}
            </button>
            {showSeo && (
              <div className="mt-4">
                <Field label="SEO Keywords" hint="Comma-separated keywords used for search/meta.">
                  <input value={form.seo_keywords} onChange={(e) => update('seo_keywords', e.target.value)} className={inputClass(false)} />
                </Field>
              </div>
            )}
          </div>

          {/* Publishing */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-ink">Publishing</h3>

            <Field label="Status">
              <div className="inline-flex rounded-xl2 border border-ink/10 p-1 bg-surface/60">
                {[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'scheduled', label: 'Scheduled' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={form.status === s.value}
                    onClick={() => update('status', s.value)}
                    className={`px-4 py-1.5 rounded-xl2 text-xs font-semibold transition ${
                      form.status === s.value ? 'bg-brand-gradient text-white shadow-glass' : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>

            {form.status === 'scheduled' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Publish Date" required error={errors.publish_date}>
                  <input type="date" value={form.publish_date} onChange={(e) => update('publish_date', e.target.value)} className={inputClass(errors.publish_date)} />
                </Field>
                <Field label="Publish Time">
                  <input type="time" value={form.publish_time} onChange={(e) => update('publish_time', e.target.value)} className={inputClass(false)} />
                </Field>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-sm font-medium text-ink">Featured Content</p>
                <p className="text-xs text-ink/40">Featured content may appear in prominent areas of the platform.</p>
              </div>
              <Toggle checked={form.is_featured} onChange={(v) => update('is_featured', v)} label="Featured content" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Field label="Visibility" hint="Who can access this once published.">
                <select value={form.visibility} onChange={(e) => update('visibility', e.target.value)} className={inputClass(false)}>
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted (direct link only)</option>
                  <option value="private">Private</option>
                </select>
              </Field>
              <div className="flex items-center justify-between gap-4 pb-2.5">
                <p className="text-sm font-medium text-ink">Allow Comments</p>
                <Toggle checked={form.allow_comments} onChange={(v) => update('allow_comments', v)} label="Allow comments" />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24">
          <PreviewPanel
            form={form}
            section={section}
            category={categories.find((c) => String(c.id) === String(form.category_id))?.name}
            language={languages.find((l) => l.code === form.language)?.name}
            thumbnail={thumbnail}
            media={media}
            mediaKind={mediaKind}
            requiresBody={requiresBody}
          />
        </div>
      </div>

      {submitError && (
        <div className="glass-card p-4 border border-red-200 bg-red-50/60 flex items-center justify-between gap-4">
          <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {submitError}</p>
          <button onClick={() => handleSubmit(form.status === 'draft' ? 'draft' : form.status)} className="text-xs font-semibold text-red-600 underline shrink-0">
            Try Again
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-4">
        <button onClick={handleCancel} className="px-6 py-3 rounded-full text-sm font-semibold text-ink/60 hover:text-ink flex items-center gap-1.5 justify-center">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={submitting}
            className="px-6 py-3 rounded-full bg-white glass-card font-semibold text-sm disabled:opacity-60"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit(form.status === 'draft' ? 'published' : form.status)}
            disabled={submitting}
            className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting
              ? (form.status === 'scheduled' ? 'Scheduling...' : 'Publishing...')
              : (form.status === 'scheduled' ? 'Schedule Content' : 'Publish Content')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeCard({ type, active, onClick }) {
  const Icon = type.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-2xl border transition-all ${
        active
          ? 'border-secondary bg-brand-gradient-soft shadow-glass'
          : 'border-ink/10 bg-white hover:border-secondary/30 hover:bg-surface'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-secondary' : 'text-ink/50'}`} />
      <span className={`text-xs font-semibold ${active ? 'text-secondary' : 'text-ink/70'}`}>{type.label}</span>
    </button>
  );
}

function PreviewPanel({ form, section, category, language, thumbnail, media, mediaKind, requiresBody }) {
  const cover = thumbnail.previewUrl || thumbnail.uploadedUrl;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-secondary" />
        <h3 className="text-sm font-semibold text-ink">Preview</h3>
      </div>

      <div className="rounded-2xl overflow-hidden bg-brand-gradient-soft aspect-video flex items-center justify-center mb-4">
        {mediaKind === 'video' && media.uploadedUrl ? (
          <video src={media.uploadedUrl} controls className="w-full h-full object-cover bg-ink" />
        ) : mediaKind === 'audio' && media.uploadedUrl ? (
          <div className="w-full px-6">
            <audio src={media.uploadedUrl} controls className="w-full" />
          </div>
        ) : mediaKind === 'image' && (media.previewUrl || media.uploadedUrl) ? (
          <img src={media.previewUrl || media.uploadedUrl} alt="" className="w-full h-full object-cover" />
        ) : cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl brand-gradient-text font-display font-bold">AIM</span>
        )}
      </div>

      <h4 className="font-display font-semibold text-ink leading-snug mb-1">
        {form.title || 'Untitled content'}
      </h4>
      <p className="text-xs text-secondary font-medium mb-2">
        {[category, language].filter(Boolean).join(' • ') || SECTION_DESTINATION[section]}
      </p>
      <p className="text-sm text-ink/60 line-clamp-3">
        {form.description || 'A short description will appear here.'}
      </p>

      {requiresBody && form.body && (
        <div
          className="prose prose-sm max-w-none mt-3 pt-3 border-t border-ink/10 text-ink/70 line-clamp-6"
          dangerouslySetInnerHTML={{ __html: form.body }}
        />
      )}

      {mediaKind === 'document' && media.uploadedUrl && (
        <a href={media.uploadedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-secondary">
          <FileType className="w-3.5 h-3.5" /> Open document
        </a>
      )}
    </div>
  );
}
