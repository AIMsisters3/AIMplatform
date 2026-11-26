import React, { useState } from 'react';
import { Image as ImageIcon, Video, Upload, Headphones } from 'lucide-react';
import api from '../../../api/axios.js';
import Dropzone from '../upload/Dropzone.jsx';
import { uploadFileChunked } from '../../utils/chunkedUpload.js';

const KIND_META = {
  image: { icon: ImageIcon, accept: 'image/*', folder: 'children', chunked: false },
  video: { icon: Video, accept: 'video/*', folder: 'children/stories', chunked: true },
  document: { icon: Upload, accept: '.pdf', folder: 'children', chunked: false },
  // Not Children's-Ministry-specific despite this file's folder - the
  // Bible Studies chapter builder (Admin/Pages/BibleStudies/
  // CollectionsTab.jsx) reuses this same generic field for its audio/PDF
  // uploads rather than duplicating upload logic a third time.
  audio: { icon: Headphones, accept: 'audio/*', folder: 'bible_studies', chunked: true },
};

/**
 * One reusable upload control for every Children's Ministry admin form
 * (Story video/thumbnail, Lesson cover/section images, Activity
 * question/option images) - wraps the existing Dropzone presentational
 * component with real upload logic, simple (one POST /upload) for
 * images/documents or chunked (uploadFileChunked) for video, same
 * resilience the main Upload Content flow already relies on for large
 * files.
 */
export default function MediaField({ label, value, onChange, kind = 'image', folder }) {
  const meta = KIND_META[kind] || KIND_META.image;
  const [state, setState] = useState({ file: null, previewUrl: value || null, uploading: false, progress: 0, error: null });

  async function handleSelect(file) {
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setState({ file, previewUrl, uploading: true, progress: 0, error: null });

    try {
      let url;
      if (meta.chunked) {
        const result = await uploadFileChunked(file, folder || meta.folder, 8, {
          onProgress: (pct) => setState((s) => ({ ...s, progress: pct })),
        });
        url = result.url;
      } else {
        const data = new FormData();
        data.append('file', file);
        data.append('folder', folder || meta.folder);
        const res = await api.post('/upload', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            setState((s) => ({ ...s, progress: Math.round((evt.loaded / evt.total) * 100) }));
          },
        });
        url = res.data.data.url;
      }
      setState((s) => ({ ...s, uploading: false, progress: 100, previewUrl: previewUrl || url }));
      onChange(url);
    } catch (err) {
      setState((s) => ({ ...s, uploading: false, error: err.response?.data?.message || 'Upload failed.' }));
    }
  }

  function handleRemove() {
    setState({ file: null, previewUrl: null, uploading: false, progress: 0, error: null });
    onChange(null);
  }

  return (
    <div>
      {label && <p className="text-xs font-semibold text-ink/50 mb-1.5">{label}</p>}
      <Dropzone
        icon={meta.icon}
        title={label || 'file'}
        accept={meta.accept}
        kind={kind === 'video' ? 'file' : kind}
        file={state.file}
        previewUrl={state.previewUrl || value}
        uploadedUrl={value}
        uploading={state.uploading}
        progress={state.progress}
        error={state.error}
        onSelect={handleSelect}
        onRemove={handleRemove}
        compact
      />
    </div>
  );
}
