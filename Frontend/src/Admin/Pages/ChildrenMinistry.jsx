import React, { useState } from 'react';
import { LayoutDashboard, BookHeart, BookOpen, Puzzle } from 'lucide-react';
import Overview from './Children/Overview.jsx';
import StoriesTab from './Children/StoriesTab.jsx';
import LessonsTab from './Children/LessonsTab.jsx';
import ActivitiesTab from './Children/ActivitiesTab.jsx';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, Component: Overview },
  { key: 'stories', label: 'Bible Stories', icon: BookHeart, Component: StoriesTab },
  { key: 'lessons', label: 'Bible Lessons', icon: BookOpen, Component: LessonsTab },
  { key: 'activities', label: 'Bible Activities', icon: Puzzle, Component: ActivitiesTab },
];

/**
 * A deliberately separate admin area (spec: "I do not want Children's
 * content to be managed together with the ordinary Update Content
 * functionality") - its own page, own nav entry (/admin/children), own
 * children.manage permission, independent of ManageContent/
 * UploadContent entirely. Tabs rather than four separate sidebar
 * entries, per the investigation's recommendation, to keep the main
 * sidebar from growing unwieldy.
 */
export default function ChildrenMinistry() {
  const [tab, setTab] = useState('overview');
  const Active = TABS.find((t) => t.key === tab)?.Component || Overview;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl">Children's Ministry</h2>
        <p className="text-sm text-ink/50 mt-1">Manage Bible Stories, Lessons, and interactive Activities for the Little Lights section.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white text-ink/60 border border-ink/10 hover:border-secondary/40'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  );
}
