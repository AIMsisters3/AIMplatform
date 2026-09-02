import api from '../../api/axios.js';

const RESUME_KEY_PREFIX = 'aim_upload_resume:';
const MAX_CHUNK_RETRIES = 4;

function resumeKeyFor(file) {
  return `${RESUME_KEY_PREFIX}${file.name}:${file.size}:${file.lastModified}`;
}

function loadResumeState(file) {
  try {
    const raw = localStorage.getItem(resumeKeyFor(file));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveResumeState(file, state) {
  try {
    localStorage.setItem(resumeKeyFor(file), JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) - upload still
    // works, it just can't resume across a page reload.
  }
}

function clearResumeState(file) {
  try {
    localStorage.removeItem(resumeKeyFor(file));
  } catch {
    // ignore
  }
}

function randomUploadId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  // Fallback for browsers without crypto.randomUUID (older Safari/Firefox).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function uploadChunkWithRetry(formData, onChunkLoaded, signal, attempt = 1) {
  try {
    await api.post('/upload/chunk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
      onUploadProgress: (evt) => {
        if (evt.total) onChunkLoaded(evt.loaded);
      },
    });
  } catch (err) {
    if (signal?.aborted || attempt >= MAX_CHUNK_RETRIES) throw err;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    return uploadChunkWithRetry(formData, onChunkLoaded, signal, attempt + 1);
  }
}

/**
 * Uploads a (potentially very large) file in small chunks instead of one
 * giant request. Two things this buys over a single POST:
 *
 *  - A dropped connection only loses the current ~8MB chunk, not the
 *    whole multi-GB transfer (each chunk retries a few times on its own
 *    before giving up).
 *  - If the whole upload is abandoned (network dies, tab closed) and the
 *    admin picks the SAME file again later — even after reloading the
 *    page — this resumes from the first missing chunk instead of
 *    restarting at 0%, using a small localStorage note of which upload_id
 *    that file was assigned. The server is still the source of truth for
 *    which chunks actually arrived (GET /api/upload/chunk); localStorage
 *    only remembers the upload_id to ask about.
 *
 * `folder` matches the single-shot endpoint's convention (thumbnails,
 * videos, audio, documents, general). Returns the same {url, filename,
 * type, folder} shape POST /api/upload does, so callers don't need to
 * know which path was used.
 */
export async function uploadFileChunked(file, folder, chunkSizeMb, { onProgress, signal } = {}) {
  const chunkSize = Math.max(1, chunkSizeMb) * 1024 * 1024;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  let uploadId = null;
  let startChunk = 0;

  const resumeState = loadResumeState(file);
  if (resumeState && resumeState.totalChunks === totalChunks && resumeState.folder === folder) {
    try {
      const { data } = await api.get('/upload/chunk', { params: { upload_id: resumeState.uploadId }, signal });
      const received = new Set(data.data.received_chunks);
      if (received.size > 0) {
        uploadId = resumeState.uploadId;
        while (received.has(startChunk)) startChunk++;
      }
    } catch {
      // Session expired/gone server-side - fall through and start fresh.
    }
  }
  if (!uploadId) {
    uploadId = randomUploadId();
    startChunk = 0;
  }

  saveResumeState(file, { uploadId, totalChunks, folder });

  let uploadedBytes = Math.min(startChunk * chunkSize, file.size);
  onProgress?.(Math.round((uploadedBytes / file.size) * 100));

  for (let i = startChunk; i < totalChunks; i++) {
    if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError');

    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', blob, file.name);
    formData.append('upload_id', uploadId);
    formData.append('chunk_index', String(i));
    formData.append('total_chunks', String(totalChunks));
    formData.append('filename', file.name);
    formData.append('folder', folder);

    const bytesBeforeThisChunk = uploadedBytes;
    await uploadChunkWithRetry(
      formData,
      (loadedInChunk) => {
        const overall = bytesBeforeThisChunk + loadedInChunk;
        onProgress?.(Math.min(99, Math.round((overall / file.size) * 100)));
      },
      signal
    );
    uploadedBytes = bytesBeforeThisChunk + blob.size;
  }

  const res = await api.post('/upload/finalize', { upload_id: uploadId }, { signal });
  clearResumeState(file);
  onProgress?.(100);
  return res.data.data;
}

/** Cancels a not-yet-finalized chunked upload and forgets its resume state — used when the admin removes/replaces a file mid-upload. */
export function cancelChunkedUpload(file) {
  const state = loadResumeState(file);
  clearResumeState(file);
  if (state?.uploadId) {
    api.delete('/upload/chunk', { params: { upload_id: state.uploadId } }).catch(() => {});
  }
}
