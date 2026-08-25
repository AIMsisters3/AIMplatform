import React, { useState } from 'react';

const TOOLS = [
  { key: 'title', label: 'Generate Titles', placeholder: 'Describe your content...' },
  { key: 'description', label: 'Generate Description', placeholder: 'Paste a summary or outline...' },
  { key: 'tags', label: 'Suggest Tags', placeholder: 'Paste your content body...' },
  { key: 'verses', label: 'Bible Verse Suggestions', placeholder: 'What topic or theme?' },
  { key: 'captions', label: 'Social Media Captions', placeholder: 'Describe the post...' },
  { key: 'seo', label: 'SEO Keywords', placeholder: 'What is the content about?' },
  { key: 'grammar', label: 'Grammar Improvements', placeholder: 'Paste text to improve...' },
  { key: 'sermon', label: 'Sermon Ideas', placeholder: 'What topic or Bible book?' },
  { key: 'outline', label: 'Bible Study Outlines', placeholder: 'What is the study about?' },
  { key: 'video_desc', label: 'Video Descriptions', placeholder: 'Describe the video...' },
  { key: 'yt_titles', label: 'YouTube Titles', placeholder: 'Describe the video content...' },
];

export default function AIAssistant() {
  const [active, setActive] = useState(TOOLS[0].key);
  const [input, setInput] = useState('');

  const tool = TOOLS.find((t) => t.key === active);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="glass-card p-4 h-fit">
        <p className="text-xs font-semibold text-ink/40 uppercase mb-3">AI Tools</p>
        <div className="space-y-1">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`w-full text-left px-4 py-2.5 rounded-xl2 text-sm font-medium transition ${
                active === t.key ? 'bg-brand-gradient text-white' : 'hover:bg-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 glass-card p-6">
        <h2 className="font-display font-semibold text-lg mb-1">✨ {tool.label}</h2>
        <p className="text-xs text-ink/50 mb-4">
          Connect an OpenAI API key in Settings → Integrations to enable live generation.
        </p>

        <textarea
          rows={6}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={tool.placeholder}
          className="w-full px-4 py-3 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary mb-4"
        />

        <button disabled className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass opacity-60 cursor-not-allowed">
          Generate
        </button>

        <div className="mt-6 p-4 rounded-2xl bg-brand-gradient-soft text-sm text-ink/50">
          Generated suggestions will appear here once the AI integration is connected.
        </div>
      </div>
    </div>
  );
}
