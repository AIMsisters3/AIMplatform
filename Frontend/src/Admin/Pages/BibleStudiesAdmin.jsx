import React, { useState } from 'react';
import { Star, BookMarked, Layers, CalendarDays, Settings as SettingsIcon } from 'lucide-react';
import FeaturedTab from './BibleStudies/FeaturedTab.jsx';
import CollectionsTab from './BibleStudies/CollectionsTab.jsx';
import ManageReadingPlans from './ManageReadingPlans.jsx';
import SettingsTab from './BibleStudies/SettingsTab.jsx';

const TABS = [
  { key: 'featured', label: 'Featured Studies', icon: Star, Component: FeaturedTab },
  {
    key: 'prophecy', label: 'Prophecy Studies', icon: BookMarked,
    Component: () => <CollectionsTab isProphecy subtitle="Daniel, Revelation and Matthew 24 are the permanent starting collections - add more any time." title="Prophecy Collections" />,
  },
  {
    key: 'topics', label: 'Explore Bible Topics', icon: Layers,
    Component: () => <CollectionsTab isProphecy={false} subtitle="Fully admin-created topics (e.g. The Sanctuary, The Sabbath) - nothing here is hardcoded." title="Bible Topics" />,
  },
  { key: 'reading-plans', label: 'Bible Reading Plans', icon: CalendarDays, Component: ManageReadingPlans },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, Component: SettingsTab },
];

/**
 * The dedicated Bible Studies admin area (redesign spec §1) - every
 * section the public Bible Studies page shows (Featured, Prophecy,
 * Explore Bible Topics, Bible Reading Plan) is manageable from here,
 * separate from the ordinary Update Content / Manage Series flow, same
 * tabbed-dashboard pattern as Children's Ministry.
 */
export default function BibleStudiesAdmin() {
  const [tab, setTab] = useState('featured');
  const Active = TABS.find((t) => t.key === tab)?.Component || FeaturedTab;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl">Bible Studies</h2>
        <p className="text-sm text-ink/50 mt-1">Manage everything shown on the public Bible Studies page from here.</p>
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
