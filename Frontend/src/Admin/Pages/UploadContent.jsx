import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios.js';
import Dropzone from '../Components/upload/Dropzone.jsx';
import RichTextEditor from '../Components/upload/RichTextEditor.jsx';
import TagInput from '../Components/upload/TagInput.jsx';
import { uploadFileChunked, cancelChunkedUpload } from '../utils/chunkedUpload.js';
import {
  Video, Film, Headphones, FileText, Image as ImageIcon, FileType, BookOpen,
  Palette, MessageSquare, Music2,
  Newspaper, BookHeart, Images, ChevronDown, ChevronUp, Loader2, CheckCircle2,
  AlertCircle, Sparkles, ArrowLeft, Library, Baby, Radio, RotateCcw, X, Upload,
} from 'lucide-react';

// Where the admin explicitly says this upload will appear — chosen first,
// before any media-type detail. Matches ContentController::SECTION_MEDIA_TYPES
// exactly. Content/Media Library, News, and Devotion each have more than one
// media_type underneath them (CONTENT_TYPES / NEWS_TYPES / DEVOTION_TYPES
// below); Bible Study picks its format via the "Study Type" field; Gallery
// is a single fixed media_type (SINGLETON_MEDIA_TYPE), so no further choice
// is needed once that section is picked.
const SECTIONS = [
  { key: 'media_library', label: 'Content / Media Library', icon: Library },
  { key: 'bible_study', label: 'Bible Study', icon: BookOpen },
  { key: 'devotions', label: 'Devotion', icon: BookHeart },
  { key: 'kids', label: 'Children', icon: Baby },
  { key: 'songs', label: 'Songs', icon: Music2 },
  { key: 'gallery', label: 'Gallery', icon: Images },
  { key: 'news', label: 'News', icon: Newspaper },
];

// Gallery and Songs are each a single fixed media_type - no further "what
// type is this" choice is needed once the section itself is picked.
const SINGLETON_MEDIA_TYPE = {
  gallery: 'photo_gallery',
  songs: 'song',
};

// The default type-card key to pre-select when switching into a section that
// has its own card grid (media_library / news / devotions / kids) — keeps
// selectedKey valid instead of carrying over a key from whichever section
// was picked before.
const DEFAULT_TYPE_KEY = { media_library: 'video', news: 'news_article', devotions: 'devotion_article', kids: 'kids_bible_story' };

// ---------------------------------------------------------------------
// Media types available WITHIN "News" — a news post isn't always a written
// article, so this mirrors ContentController::SECTION_MEDIA_TYPES['news'].
// ---------------------------------------------------------------------
const NEWS_TYPES = [
  { key: 'news_article', label: 'Article', icon: FileText, media_type: 'news_article' },
  { key: 'news_video', label: 'Video', icon: Video, media_type: 'video' },
  { key: 'news_pdf', label: 'PDF', icon: FileType, media_type: 'pdf' },
];

// ---------------------------------------------------------------------
// Media types available WITHIN "Devotion" — a devotion isn't always a
// written article either, so this mirrors
// ContentController::SECTION_MEDIA_TYPES['devotions'].
// ---------------------------------------------------------------------
const DEVOTION_TYPES = [
  { key: 'devotion_article', label: 'Article', icon: FileText, media_type: 'devotional' },
  { key: 'devotion_video', label: 'Video', icon: Video, media_type: 'video' },
  { key: 'devotion_audio', label: 'Audio', icon: Headphones, media_type: 'audio' },
];

// ---------------------------------------------------------------------
// Media types available WITHIN "Kids" — its own dedicated, safe area
// (not just another category), mirrors
// ContentController::SECTION_MEDIA_TYPES['kids']. Simplified by
// migration 025: Cartoon/Other removed. Song's media_type is
// 'kids_song', not 'song' — that string is reserved for the separate,
// always-audio Songs section (SINGLETON_MEDIA_TYPE.songs below).
// ---------------------------------------------------------------------
const KIDS_TYPES = [
  { key: 'kids_bible_story', label: 'Bible Story', icon: BookHeart, media_type: 'bible_story' },
  { key: 'kids_bible_lesson', label: 'Bible Lesson', icon: BookOpen, media_type: 'bible_lesson' },
  { key: 'kids_song', label: 'Song', icon: Music2, media_type: 'kids_song' },
  { key: 'kids_activity', label: 'Activity', icon: Sparkles, media_type: 'activity' },
];

// Bible Lesson (PDF or Poster), Song (Video or Audio), and Activity
// (Poster, Video, or PDF) each need a further choice of what kind of
// file this particular upload is — unlike Bible Story, which is always
// a video. Keyed by the type card's media_type; each option's `kind`
// drives the Media field directly (bypassing mediaKindFor()'s
// media_type-only table for just these three).
const KIDS_SUBTYPES = {
  bible_lesson: [
    { value: 'pdf', label: 'PDF', kind: 'document' },
    { value: 'poster', label: 'Poster', kind: null },
  ],
  kids_song: [
    { value: 'video', label: 'Video', kind: 'video' },
    { value: 'audio', label: 'Audio', kind: 'audio' },
  ],
  activity: [
    { value: 'poster', label: 'Poster', kind: null },
    { value: 'video', label: 'Video', kind: 'video' },
    { value: 'pdf', label: 'PDF', kind: 'document' },
  ],
};

// ---------------------------------------------------------------------
// Media types available WITHIN the "Content / Media Library" section only —
// Bible Study/Devotion/Gallery/News/Songs each have their own way of
// picking a type instead (see above/below). Each card maps directly onto a
// media_type as validated server-side in
// ContentController::SECTION_MEDIA_TYPES['media_library']. Movie/Cartoon/
// Animation are removed here (Cartoon remains available under Kids only,
// for children's content). Sermon and Documentary now live only under
// Bible Study — see BIBLE_STUDY_TYPES below. Article and PDF now live only
// under News/Bible Study/Devotions — not here.
// ---------------------------------------------------------------------
const CONTENT_TYPES = [
  { key: 'video', label: 'Video', icon: Video, media_type: 'video', group: 'primary' },
  { key: 'short_film', label: 'Short Film', icon: Film, media_type: 'short_film', group: 'primary' },
  { key: 'audio', label: 'Audio', icon: Headphones, media_type: 'audio', group: 'primary' },
  { key: 'image', label: 'Image', icon: ImageIcon, media_type: 'image', group: 'primary' },

  { key: 'interview', label: 'Interview', icon: MessageSquare, media_type: 'interview', group: 'more' },
  { key: 'music', label: 'Music', icon: Music2, media_type: 'music', group: 'more' },
];

// Simplified (migration 022) to exactly 4 formats per spec: Video, PDF,
// Article, Poster. The many finer-grained formats this used to offer
// (Short Film, Sermon, Panel Discussion, Podcast, Interview, Animated,
// Documentary) all read as "a video" to a visitor and are folded into
// Video. 'image' is labeled "Poster" here to match Content.jsx's own
// Poster type (media_type 'image', a single cover image, no separate
// upload — see mediaKindFor() below).
const BIBLE_STUDY_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'article', label: 'Article' },
  { value: 'image', label: 'Poster' },
];

// Mirrors ContentController::BODY_REQUIRED_MEDIA_TYPES exactly. Kids
// bible lessons are deliberately absent (migration 025: PDF-or-Poster
// only, no written-article format any more).
const BODY_REQUIRED_MEDIA_TYPES = ['article', 'news_article', 'devotional'];

// PDF types support EITHER an uploaded file OR typed text, chosen by the
// admin (spec: "support typed notes/text ... rather than requiring every
// document to be uploaded as a file") — these get their own mediaKind
// ('document_or_text') with a toggle, rather than being folded into
// BODY_REQUIRED_MEDIA_TYPES (which would remove the file option) or plain
// 'document' (which would remove the typed-text option).
const TEXT_OPTIONAL_MEDIA_TYPES = ['pdf'];

// What kind of main-media control to show for a given media_type. `null`
// means "no separate main file" — Article/News/Devotional use the rich
// text body instead, and Photo Gallery/Image both reuse the Cover Image
// field as their one photo rather than asking the admin to upload the same
// image twice (once as "thumbnail", once as "the content"). Kids' Activity
// is treated as a printable document (worksheet/coloring page), and Song
// as audio, same reasoning as the rest of this list.
function mediaKindFor(mediaType) {
  if (TEXT_OPTIONAL_MEDIA_TYPES.includes(mediaType)) return 'document_or_text';
  if (BODY_REQUIRED_MEDIA_TYPES.includes(mediaType)) return 'article';
  if (mediaType === 'photo_gallery' || mediaType === 'image') return null;
  if (mediaType === 'activity') return 'document';
  if (['audio', 'music', 'song'].includes(mediaType)) return 'audio';
  return 'video';
}

// Extensions/folders mirror Backend/config/config.php's ALLOWED_*_TYPES —
// these lists don't change at runtime so they stay static. The actual size
// ceiling does NOT: it's fetched from GET /api/upload/limits (see the
// `limits` state below) so this can never drift out of sync with the
// server's real MAX_UPLOAD_SIZE_MB, which is what actually gets enforced.
// This is only ever a friendly early check either way — the server
// re-validates extension, real file content (MIME sniffing), and size
// regardless of what the client claims.
const MEDIA_RULES = {
  video: { accept: '.mp4,.mov,.webm', label: 'MP4, MOV, WEBM', folder: 'videos', extensions: ['mp4', 'mov', 'webm'] },
  audio: { accept: '.mp3,.wav,.ogg', label: 'MP3, WAV, OGG', folder: 'audio', extensions: ['mp3', 'wav', 'ogg'] },
  document: { accept: '.pdf', label: 'PDF only', folder: 'documents', extensions: ['pdf'] },
  image: { accept: '.jpg,.jpeg,.png,.gif,.webp', label: 'JPG, PNG, GIF, WEBP', folder: 'general', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
};
const THUMBNAIL_RULE = { accept: '.jpg,.jpeg,.png,.gif,.webp', label: 'JPG, PNG, WEBP', folder: 'thumbnails', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] };

function formatSizeLimit(mb) {
  if (!mb) return '';
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)}GB` : `${mb}MB`;
}

const MEDIA_KIND_ICON = { video: Video, audio: Headphones, document: FileType, image: ImageIcon };

const SECTION_DESTINATION = {
  media_library: 'Content / Media Library',
  news: 'News',
  gallery: 'Gallery',
  bible_study: 'Bible Study',
  devotions: 'Devotions',
  kids: 'Children',
  songs: 'Songs',
};

// Live is only offered for sections where "a stream is happening right
// now" makes sense — Content/Media Library and Bible Study (spec: "allow
// under both Content and Bible Study").
const LIVE_ELIGIBLE_SECTIONS = ['media_library', 'bible_study'];

const emptyUpload = { file: null, previewUrl: null, uploadedUrl: null, uploading: false, progress: 0, error: null, durationSeconds: null };

// Reads a video OR audio file's real duration client-side via a throwaway
// <video> element — a plain audio file loaded into one still populates
// .duration correctly (no visible video track needed), so this covers
// both without a second implementation. No server-side ffmpeg/ffprobe
// dependency (this shared host almost certainly doesn't have one).
// Resolves null on any failure rather than rejecting, so a file the
// browser can't probe just omits the duration instead of blocking the
// upload.
function readMediaDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const seconds = Number.isFinite(el.duration) ? Math.round(el.duration) : null;
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    el.src = url;
  });
}

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
  kids_subtype: '', // see KIDS_SUBTYPES — falls back to that type's first option when unset
  is_live: false, live_url: '',
  notes_mode: 'file', // 'file' | 'text' — see TEXT_OPTIONAL_MEDIA_TYPES
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

// forwardRef so a field can be scrolled/focused-into-view when it fails
// validation on Publish (see fieldRefs/focusFirstError below).
const Field = React.forwardRef(function Field({ label, required, error, hint, children }, ref) {
  return (
    <label ref={ref} className="block">
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
});

const inputClass = (hasError) =>
  `w-full px-4 py-2.5 rounded-xl2 border ${hasError ? 'border-red-300' : 'border-ink/10'} focus:outline-none focus:ring-2 focus:ring-secondary bg-white`;

// Autosave / draft-recovery: a periodic localStorage snapshot so a closed
// tab, dropped connection, or accidental refresh doesn't lose an in-progress
// upload — separate from the explicit "Save Draft" button, which persists
// to the server instead. Only the already-uploaded file URLs are kept (not
// the File objects themselves, which can't survive a reload); the admin
// keeps whatever they'd already uploaded when they resume, and just
// re-picks anything still in flight at the time of the interruption.
const DRAFT_STORAGE_KEY = 'aim_upload_draft_v1';

function saveDraftSnapshot(snapshot) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage unavailable/full/private-mode — autosave is best-effort only.
  }
}

function readDraftSnapshot() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraftSnapshot() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function UploadContent() {
  const navigate = useNavigate();

  const [selectedSection, setSelectedSection] = useState('media_library');
  const [selectedKey, setSelectedKey] = useState('video');
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [showSeo, setShowSeo] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [thumbnail, setThumbnail] = useState(emptyUpload);
  const [media, setMedia] = useState(emptyUpload);

  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [limits, setLimits] = useState(null);
  const maxSizeMb = limits?.max_size_mb || 100; // conservative fallback only until the real limit loads

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null); // { slug, viewHref, published }

  // A draft found in localStorage on mount, offered for recovery — see
  // "Autosave / draft-recovery" above. Stays null once resumed, discarded,
  // or if there was nothing to recover.
  const [recoverableDraft, setRecoverableDraft] = useState(null);

  // Tracks the in-flight chunked upload (if any) for the main media file,
  // so Replace/Remove/switching content type can cancel it instead of
  // letting an abandoned upload keep running in the background.
  const mediaAbortRef = useRef(null);

  // Maps a validation error key to the DOM node of its Field, so a failed
  // Publish can scroll to and focus the first thing that needs fixing
  // instead of leaving the admin to hunt for a small red text somewhere on
  // the page. Order matches the form's actual top-to-bottom layout.
  const fieldRefs = useRef({});
  const FIELD_ORDER = ['title', 'body', 'category_id', 'language', 'thumbnail', 'media', 'publish_date', 'episode_number'];

  function focusFirstError(errs) {
    const key = FIELD_ORDER.find((k) => errs[k]);
    const el = key && fieldRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('input, select, textarea, [contenteditable="true"]')?.focus();
  }

  const section = selectedSection;
  const isBibleStudy = section === 'bible_study';
  const isGallery = section === 'gallery';
  const isSongs = section === 'songs';
  const isKids = section === 'kids';
  // None of Gallery, Songs, or Children Zone offer a Category choice
  // (spec) - Gallery never did (it reuses Language's "Not applicable"
  // pattern below); Songs and Kids are simplified the same way.
  const isNoCategory = isGallery || isSongs || isKids;
  const typePool = section === 'news' ? NEWS_TYPES : section === 'devotions' ? DEVOTION_TYPES : section === 'kids' ? KIDS_TYPES : CONTENT_TYPES;
  const selectedType = typePool.find((t) => t.key === selectedKey) || typePool[0];
  const mediaType = isBibleStudy
    ? (form.media_type_bible_study || 'video')
    : (SINGLETON_MEDIA_TYPE[section] || selectedType.media_type);
  // Bible Lesson/Song/Activity each offer a further choice of file kind
  // within Kids (see KIDS_SUBTYPES) - falls back to that type's first
  // option so switching type cards never leaves an invalid selection
  // lingering from whichever type was picked before.
  const kidsSubtypeOptions = section === 'kids' ? KIDS_SUBTYPES[mediaType] : null;
  const selectedKidsSubtype = kidsSubtypeOptions
    ? (kidsSubtypeOptions.find((s) => s.value === form.kids_subtype) || kidsSubtypeOptions[0])
    : null;
  const mediaKind = kidsSubtypeOptions ? selectedKidsSubtype.kind : mediaKindFor(mediaType);
  const requiresBody = mediaKind === 'article';
  const isDocumentOrText = mediaKind === 'document_or_text';
  const isTextNotes = isDocumentOrText && form.notes_mode === 'text';
  // Songs and Kids have no Series functionality (spec: "remove all
  // Series functionality from Songs/Children Zone") - excluded here even
  // though a video/audio mediaKind would otherwise show it.
  const showSeries = (mediaKind === 'video' || mediaKind === 'audio') && !isSongs && section !== 'kids';
  const isLiveEligible = LIVE_ELIGIBLE_SECTIONS.includes(section) && mediaKind === 'video';
  const isLive = isLiveEligible && form.is_live;

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
    api.get('/upload/limits')
      .then((r) => setLimits(r.data?.data || null))
      .catch(() => setLimits(null));

    const draft = readDraftSnapshot();
    if (draft?.form?.title?.trim()) setRecoverableDraft(draft);
  }, []);

  // Debounced autosave — waits for a pause in typing/uploading rather than
  // writing on every keystroke. Skipped while there's nothing worth saving
  // yet, while the success screen is showing (nothing left to protect), or
  // while an unresolved recovery banner is up (so it can't silently
  // overwrite the very draft it's offering to resume before the admin
  // decides).
  useEffect(() => {
    if (recoverableDraft || result || !form.title.trim()) return;
    const timer = setTimeout(() => {
      saveDraftSnapshot({
        savedAt: Date.now(),
        selectedSection,
        selectedKey,
        form,
        thumbnailUrl: thumbnail.uploadedUrl || null,
        mediaUrl: media.uploadedUrl || null,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [form, selectedSection, selectedKey, thumbnail.uploadedUrl, media.uploadedUrl, recoverableDraft, result]);

  function resumeDraft() {
    if (!recoverableDraft) return;
    setSelectedSection(recoverableDraft.selectedSection || 'media_library');
    setSelectedKey(recoverableDraft.selectedKey || 'video');
    setForm({ ...DEFAULT_FORM, ...recoverableDraft.form });
    setThumbnail(recoverableDraft.thumbnailUrl ? { ...emptyUpload, uploadedUrl: recoverableDraft.thumbnailUrl } : emptyUpload);
    setMedia(recoverableDraft.mediaUrl ? { ...emptyUpload, uploadedUrl: recoverableDraft.mediaUrl } : emptyUpload);
    setRecoverableDraft(null);
  }

  function discardDraft() {
    clearDraftSnapshot();
    setRecoverableDraft(null);
  }

  // Switching what's being uploaded changes which main-media control (if
  // any) applies — drop a file picked for a now-irrelevant kind rather
  // than silently carrying it into the new submission, cancelling any
  // upload still in flight for the old kind first.
  useEffect(() => {
    if (mediaAbortRef.current) {
      mediaAbortRef.current.abort();
      mediaAbortRef.current = null;
    }
    setMedia(emptyUpload);
    setForm((f) => (f.is_live || f.live_url ? { ...f, is_live: false, live_url: '' } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKind]);

  // Live is only offered for two sections — dropping straight into a
  // section where it doesn't apply (e.g. Gallery) must not leave a
  // stale is_live=true silently carried into that submission.
  useEffect(() => {
    if (!isLiveEligible && form.is_live) {
      setForm((f) => ({ ...f, is_live: false, live_url: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveEligible]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function selectSection(key) {
    setSelectedSection(key);
    setSelectedKey(DEFAULT_TYPE_KEY[key] || 'video');
    setErrors((e) => ({ ...e, type: undefined }));
  }

  function selectType(key) {
    setSelectedKey(key);
    setErrors((e) => ({ ...e, type: undefined }));
  }

  // Small, single-request upload — used only for the thumbnail (always a
  // small image). The main media file below uses chunked upload instead.
  async function uploadSimple(file, folder, setState) {
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

  // Large-file upload — splits the file into small chunks so a dropped
  // connection only loses the current chunk, not the whole transfer, and
  // (via chunkedUpload.js's localStorage note) picking the same file again
  // later resumes instead of restarting at 0%. mediaAbortRef lets
  // Replace/Remove/switching content type cancel an in-flight upload.
  async function uploadChunked(file, folder, setState) {
    setState((s) => ({ ...s, uploading: true, progress: 0, error: null }));
    const controller = new AbortController();
    mediaAbortRef.current = controller;
    try {
      const result = await uploadFileChunked(file, folder, limits?.chunk_size_mb || 8, {
        onProgress: (pct) => setState((s) => ({ ...s, progress: pct })),
        signal: controller.signal,
      });
      setState((s) => ({ ...s, uploading: false, progress: 100, uploadedUrl: result.url }));
      return result.url;
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return null; // cancelled by Replace/Remove/type switch — caller already reset state
      }
      setState((s) => ({ ...s, uploading: false, error: err.response?.data?.message || 'The file could not be uploaded.' }));
      return null;
    } finally {
      if (mediaAbortRef.current === controller) mediaAbortRef.current = null;
    }
  }

  function validateAndPick(file, rule, setState, chunked) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!rule.extensions.includes(ext)) {
      setState((s) => ({ ...s, error: `That file type isn't supported. Use: ${rule.label}` }));
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setState((s) => ({ ...s, error: `File exceeds the ${formatSizeLimit(maxSizeMb)} limit.` }));
      return;
    }
    if (chunked && mediaAbortRef.current) {
      mediaAbortRef.current.abort(); // Replace clicked mid-upload — stop the old attempt first
      mediaAbortRef.current = null;
    }
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setState({ ...emptyUpload, file, previewUrl });
    if (rule.folder === 'videos' || rule.folder === 'audio') {
      readMediaDuration(file).then((seconds) => setState((s) => ({ ...s, durationSeconds: seconds })));
    }
    if (chunked) uploadChunked(file, rule.folder, setState);
    else uploadSimple(file, rule.folder, setState);
  }

  function removeUpload(setState) {
    setState(emptyUpload);
  }

  function removeMedia() {
    if (mediaAbortRef.current) {
      mediaAbortRef.current.abort();
      mediaAbortRef.current = null;
    }
    if (media.file) cancelChunkedUpload(media.file);
    setMedia(emptyUpload);
  }

  function validate({ forPublish }) {
    const next = {};
    if (!form.title.trim()) next.title = 'Please enter a title.';

    if (forPublish) {
      if (!isNoCategory && !form.category_id) next.category_id = 'Please select a category.';
      if (!isGallery && !form.language) next.language = 'Please select a language.';

      if (requiresBody) {
        const plain = form.body.replace(/<[^>]*>/g, '').trim();
        if (!plain) next.body = 'Please write the article body.';
      } else if (isTextNotes) {
        const plain = form.body.replace(/<[^>]*>/g, '').trim();
        if (!plain) next.body = 'Please type the notes, or switch to uploading a file.';
      } else if (isLive) {
        if (!form.live_url.trim()) next.media = 'Please enter the live stream URL.';
      } else if (mediaKind && !media.uploadedUrl) {
        const label = mediaKind === 'video' ? 'a video' : mediaKind === 'audio' ? 'an audio file' : (mediaKind === 'document' || mediaKind === 'document_or_text') ? 'a PDF' : 'an image';
        next.media = `Please upload ${label}.`;
      }

      // Cover Image / thumbnail is always shown, so it's required on
      // publish for every type — not just Gallery/Image (which reuse it as
      // their one photo) — and must never be silently skippable.
      if (!thumbnail.uploadedUrl) {
        next.thumbnail = mediaKind === null
          ? 'Please upload an image for this item.'
          : 'Please upload a cover image / thumbnail.';
      }

      if (form.status === 'scheduled' && !form.publish_date) {
        next.publish_date = 'Please choose a publish date.';
      }
      if (showSeries && form.series_id && !form.episode_number) {
        next.episode_number = 'Please enter an episode number.';
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) requestAnimationFrame(() => focusFirstError(next));
    return Object.keys(next).length === 0;
  }

  function buildPayload(status) {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      section,
      media_type: mediaType,
      category_id: isNoCategory ? null : (form.category_id || null),
      language: isGallery ? null : (form.language || null),
      tags: form.tags || null,
      seo_keywords: form.seo_keywords.trim() || null,
      visibility: form.visibility,
      status,
      is_featured: form.is_featured,
      is_live: isLive,
      allow_comments: form.allow_comments,
      thumbnail: thumbnail.uploadedUrl || null,
      media_url: mediaKind === null
        ? (thumbnail.uploadedUrl || null)
        : isLive
          ? (form.live_url.trim() || null)
          : isTextNotes
            ? null
            : (media.uploadedUrl || null),
      body: requiresBody || isTextNotes ? form.body : null,
      transcript: !requiresBody && !isTextNotes && mediaKind ? (form.transcript.trim() || null) : null,
      // Real duration read client-side from the actual file (see
      // readMediaDuration()) - null for anything that isn't a video or
      // audio/song upload (previously video-only, which meant a song's
      // card could never show a duration no matter what was uploaded).
      duration_seconds: (mediaKind === 'video' || mediaKind === 'audio') ? (media.durationSeconds ?? null) : null,
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
      case 'kids': return `/kids?item=${slug}`;
      case 'songs': return `/songs?item=${slug}`;
      default: return '/content';
    }
  }

  async function handleSubmit(targetStatus) {
    setSubmitError('');
    const forPublish = targetStatus !== 'draft';
    if (!validate({ forPublish })) {
      setSubmitError('Please fix the highlighted fields before continuing.');
      return;
    }

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

      clearDraftSnapshot();
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
    setSelectedSection('media_library');
    setSelectedKey('video');
    setShowMoreTypes(false);
    setShowSeo(false);
    setForm(DEFAULT_FORM);
    setThumbnail(emptyUpload);
    setMedia(emptyUpload);
    setErrors({});
    setSubmitError('');
    setResult(null);
    clearDraftSnapshot();
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
      {recoverableDraft && (
        <div className="glass-card p-4 border border-secondary/20 bg-brand-gradient-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-secondary shrink-0" />
            <p className="text-sm text-ink/70">
              <span className="font-semibold text-ink">Unsaved draft found:</span> "{recoverableDraft.form.title}"
              <span className="text-ink/40"> — saved {new Date(recoverableDraft.savedAt).toLocaleString()}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={resumeDraft} className="px-4 py-2 rounded-full bg-brand-gradient text-white text-xs font-semibold shadow-glass">
              Resume Draft
            </button>
            <button onClick={discardDraft} className="px-4 py-2 rounded-full bg-white text-xs font-semibold text-ink/50 hover:text-ink flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Discard
            </button>
          </div>
        </div>
      )}

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

      {/* Where will this appear? — an explicit choice, not inferred from the media type */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-ink mb-1">Where will this appear?</h2>
        <p className="text-xs text-ink/40 mb-4">Choose the section first — the options below adjust to match.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SECTIONS.map((s) => (
            <SectionCard key={s.key} sectionOption={s} active={selectedSection === s.key} onClick={() => selectSection(s.key)} />
          ))}
        </div>
      </div>

      {/* What are you uploading? — Content / Media Library, News, and
          Devotion each have more than one media type; Bible Study picks its
          format via "Study Type" below, and Gallery is a single fixed type. */}
      {section === 'media_library' && (
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">What type of content is this?</h2>
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
        </div>
      )}

      {section === 'news' && (
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">What type of news post is this?</h2>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {NEWS_TYPES.map((t) => (
              <TypeCard key={t.key} type={t} active={selectedKey === t.key} onClick={() => selectType(t.key)} />
            ))}
          </div>
        </div>
      )}

      {section === 'devotions' && (
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">What type of devotion is this?</h2>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {DEVOTION_TYPES.map((t) => (
              <TypeCard key={t.key} type={t} active={selectedKey === t.key} onClick={() => selectType(t.key)} />
            ))}
          </div>
        </div>
      )}

      {section === 'kids' && (
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">What type of Children content is this?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {KIDS_TYPES.map((t) => (
              <TypeCard key={t.key} type={t} active={selectedKey === t.key} onClick={() => selectType(t.key)} />
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-ink/35 -mt-3">
        This will appear in <span className="font-semibold text-ink/50">{SECTION_DESTINATION[section]}</span>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Content Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <Field ref={(el) => { fieldRefs.current.title = el; }} label="Content Title" required error={errors.title}>
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
              <Field ref={(el) => { fieldRefs.current.body = el; }} label="Article Content" required error={errors.body}>
                <RichTextEditor
                  value={form.body}
                  onChange={(v) => update('body', v)}
                  placeholder="Write the full article..."
                />
              </Field>
            ) : isDocumentOrText ? (
              <Field
                ref={form.notes_mode === 'text' ? (el) => { fieldRefs.current.body = el; } : undefined}
                label="PDF / Notes Content"
                required
                error={errors.body}
                hint="Upload a PDF, or type the notes directly instead."
              >
                <div className="inline-flex rounded-xl2 border border-ink/10 p-1 bg-surface/60 mb-3">
                  <button
                    type="button"
                    aria-pressed={form.notes_mode === 'file'}
                    onClick={() => update('notes_mode', 'file')}
                    className={`px-4 py-1.5 rounded-xl2 text-xs font-semibold transition flex items-center gap-1.5 ${
                      form.notes_mode === 'file' ? 'bg-brand-gradient text-white shadow-glass' : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload a File
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.notes_mode === 'text'}
                    onClick={() => update('notes_mode', 'text')}
                    className={`px-4 py-1.5 rounded-xl2 text-xs font-semibold transition flex items-center gap-1.5 ${
                      form.notes_mode === 'text' ? 'bg-brand-gradient text-white shadow-glass' : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Type Notes
                  </button>
                </div>
                {form.notes_mode === 'text' && (
                  <RichTextEditor
                    value={form.body}
                    onChange={(v) => update('body', v)}
                    placeholder="Type the notes directly..."
                  />
                )}
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
              {isNoCategory ? (
                <Field label="Category">
                  <input disabled value="Not applicable" readOnly className={inputClass(false) + ' bg-ink/5 text-ink/40'} />
                </Field>
              ) : (
                <Field ref={(el) => { fieldRefs.current.category_id = el; }} label="Category" required error={errors.category_id}>
                  <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className={inputClass(errors.category_id)}>
                    <option value="">Select category...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              )}

              {isGallery ? (
                <Field label="Language">
                  <input disabled value="Not applicable" readOnly className={inputClass(false) + ' bg-ink/5 text-ink/40'} />
                </Field>
              ) : (
                <Field ref={(el) => { fieldRefs.current.language = el; }} label="Language" required error={errors.language}>
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

            {kidsSubtypeOptions && (
              <Field label={`${selectedType.label} format`} hint="What kind of file will this be?">
                <div className="flex flex-wrap gap-2">
                  {kidsSubtypeOptions.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => update('kids_subtype', s.value)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                        selectedKidsSubtype.value === s.value
                          ? 'bg-brand-gradient text-white shadow-glass'
                          : 'bg-white text-ink/60 border border-ink/10 hover:text-ink'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>

          {/* Media */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-ink">Media</h3>

            <Field
              ref={(el) => { fieldRefs.current.thumbnail = el; }}
              label={mediaKind === null ? 'Cover Image' : 'Cover Image / Thumbnail'}
              required
              error={errors.thumbnail}
            >
              <Dropzone
                icon={ImageIcon}
                title="image"
                acceptHint={`${THUMBNAIL_RULE.label} · up to ${formatSizeLimit(maxSizeMb)}`}
                accept={THUMBNAIL_RULE.accept}
                kind="image"
                file={thumbnail.file}
                previewUrl={thumbnail.previewUrl}
                uploadedUrl={thumbnail.uploadedUrl}
                uploading={thumbnail.uploading}
                progress={thumbnail.progress}
                error={thumbnail.error}
                onSelect={(f) => validateAndPick(f, THUMBNAIL_RULE, setThumbnail, false)}
                onRemove={() => removeUpload(setThumbnail)}
                compact
              />
            </Field>

            {isLiveEligible && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-surface/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-ink">This is a live stream</p>
                    <p className="text-xs text-ink/40">Embed a live stream URL instead of uploading a file.</p>
                  </div>
                </div>
                <Toggle checked={form.is_live} onChange={(v) => update('is_live', v)} label="Live stream" />
              </div>
            )}

            {mediaKind && mediaKind !== 'article' && !isTextNotes && (() => {
              const effectiveMediaKind = mediaKind === 'document_or_text' ? 'document' : mediaKind;
              return (
                <Field
                  ref={(el) => { fieldRefs.current.media = el; }}
                  label={isLive ? 'Live Stream URL' : effectiveMediaKind === 'video' ? 'Upload Video' : effectiveMediaKind === 'audio' ? 'Audio File' : 'Document'}
                  required
                  error={errors.media}
                >
                  {isLive ? (
                    <>
                      <input
                        value={form.live_url}
                        onChange={(e) => update('live_url', e.target.value)}
                        placeholder="https://youtube.com/watch?v=... or Facebook Live URL"
                        className={inputClass(errors.media)}
                      />
                      <p className="text-[11px] text-ink/35 mt-2">
                        Paste the YouTube/Facebook Live URL. It goes live on the site with a "LIVE" badge as soon as you publish.
                      </p>
                    </>
                  ) : (
                    <>
                      <Dropzone
                        icon={MEDIA_KIND_ICON[effectiveMediaKind]}
                        title={effectiveMediaKind === 'video' ? 'video' : effectiveMediaKind === 'audio' ? 'audio' : effectiveMediaKind === 'document' ? 'PDF' : 'image'}
                        acceptHint={`${MEDIA_RULES[effectiveMediaKind].label} · up to ${formatSizeLimit(maxSizeMb)}`}
                        accept={MEDIA_RULES[effectiveMediaKind].accept}
                        kind={effectiveMediaKind}
                        file={media.file}
                        previewUrl={media.previewUrl}
                        uploadedUrl={media.uploadedUrl}
                        uploading={media.uploading}
                        progress={media.progress}
                        error={media.error}
                        onSelect={(f) => validateAndPick(f, MEDIA_RULES[effectiveMediaKind], setMedia, true)}
                        onRemove={removeMedia}
                      />
                      {effectiveMediaKind === 'video' && (
                        <p className="text-[11px] text-ink/35 mt-2">
                          A full-length video (an hour or more) can take a while to upload depending on your connection. It uploads in small pieces, so if it's interrupted, picking the same file again will resume instead of starting over.
                        </p>
                      )}
                    </>
                  )}
                </Field>
              );
            })()}
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
                    <Field ref={(el) => { fieldRefs.current.episode_number = el; }} label="Episode #" required error={errors.episode_number}>
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
                <Field ref={(el) => { fieldRefs.current.publish_date = el; }} label="Publish Date" required error={errors.publish_date}>
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

        {/* Preview — overflow-anchor: none opts this sticky panel out of
            the browser's scroll-anchoring: without it, the live body
            preview's rendered height can shift by a line or two as the
            admin types (different word-wrapping, an image finishing its
            layout, etc.), and a sticky element changing size is exactly
            what scroll anchoring "corrects" for — usually helpfully, but
            here it was yanking the whole page's scroll position while
            typing far down the form. See also PreviewPanel's own fixed-
            height body preview below, which removes the size change at
            its source rather than just opting out of the browser's
            reaction to it. */}
        <div className="lg:sticky lg:top-24" style={{ overflowAnchor: 'none' }}>
          <PreviewPanel
            form={form}
            section={section}
            category={isNoCategory ? null : categories.find((c) => String(c.id) === String(form.category_id))?.name}
            language={isGallery ? null : languages.find((l) => l.code === form.language)?.name}
            thumbnail={thumbnail}
            media={media}
            mediaKind={mediaKind}
            requiresBody={requiresBody}
            isTextNotes={isTextNotes}
            isLive={isLive}
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

function SectionCard({ sectionOption, active, onClick }) {
  const Icon = sectionOption.icon;
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
      <span className={`text-xs font-semibold text-center leading-tight ${active ? 'text-secondary' : 'text-ink/70'}`}>{sectionOption.label}</span>
    </button>
  );
}

function PreviewPanel({ form, section, category, language, thumbnail, media, mediaKind, requiresBody, isTextNotes, isLive }) {
  const cover = thumbnail.previewUrl || thumbnail.uploadedUrl;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-secondary" />
        <h3 className="text-sm font-semibold text-ink">Preview</h3>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-brand-gradient-soft aspect-video flex items-center justify-center mb-4">
        {isLive && (
          <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wide flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </span>
        )}
        {mediaKind === 'video' && media.uploadedUrl ? (
          <video src={media.uploadedUrl} controls className="w-full h-full object-cover bg-ink" />
        ) : mediaKind === 'audio' && media.uploadedUrl ? (
          <div className="w-full px-6">
            <audio src={media.uploadedUrl} controls className="w-full" />
          </div>
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

      {/* Fixed height + overflow-hidden (not line-clamp) so this box's
          rendered size can never change while typing, regardless of how
          the live HTML re-wraps — see the sticky wrapper's own comment
          above for why that mattered. */}
      {(requiresBody || isTextNotes) && form.body && (
        <div
          className="prose prose-sm max-w-none mt-3 pt-3 border-t border-ink/10 text-ink/70 h-32 overflow-hidden"
          dangerouslySetInnerHTML={{ __html: form.body }}
        />
      )}

      {(mediaKind === 'document' || mediaKind === 'document_or_text') && media.uploadedUrl && (
        <a href={media.uploadedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-secondary">
          <FileType className="w-3.5 h-3.5" /> Open document
        </a>
      )}
    </div>
  );
}
