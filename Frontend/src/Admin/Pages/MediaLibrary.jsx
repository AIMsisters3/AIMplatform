import React, { useState, useRef } from 'react';
import api from '../../api/axios.js';

const FOLDERS = ['thumbnails', 'videos', 'audio', 'documents', 'general'];

export default function MediaLibrary() {
  const [folder, setFolder] = useState('general');
  const [search, setSearch] = useState('');
  const [uploaded, setUploaded] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(files) {
    for (const file of files) {
      const data = new FormData();
      data.append('file', file);
      data.append('folder', folder);
      try {
        const res = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        setUploaded((u) => [res.data.data, ...u]);
      } catch (err) {
        console.error('Upload failed', err);
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  const filtered = uploaded.filter((f) => f.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Media Library</h2>
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..."
            className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary text-sm" />
          <select value={folder} onChange={(e) => setFolder(e.target.value)}
            className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary text-sm">
            {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`glass-card p-12 text-center cursor-pointer transition-colors ${dragOver ? 'bg-brand-gradient-soft' : ''}`}
      >
        <p className="text-3xl mb-2">🗂️</p>
        <p className="font-semibold">Drag &amp; drop files here, or click to browse</p>
        <p className="text-xs text-ink/40 mt-1">Uploading to folder: <span className="font-semibold">{folder}</span></p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No files uploaded in this session yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {filtered.map((f, i) => (
            <div key={i} className="glass-card p-3">
              <div className="aspect-square rounded-xl2 bg-brand-gradient-soft flex items-center justify-center mb-2 overflow-hidden">
                {f.type === 'image' ? (
                  <img src={f.url} alt={f.filename} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{f.type === 'video' ? '🎬' : f.type === 'audio' ? '🎵' : '📄'}</span>
                )}
              </div>
              <p className="text-xs truncate">{f.filename}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
