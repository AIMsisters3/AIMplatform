import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-ink text-white/80 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white font-display font-bold text-lg mb-3">AIMsisters</h3>
          <p className="text-sm leading-relaxed text-white/60">
            To spread the everlasting Gospel by using digital media, prayer, Bible-based teaching, community outreach, and Christian resources that strengthen believers and reach souls for Christ.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/bible-studies" className="hover:text-white">Bible Studies</Link></li>
            <li><Link to="/series" className="hover:text-white">Series</Link></li>
            <li><Link to="/devotions" className="hover:text-white">Devotions</Link></li>
            <li><Link to="/news" className="hover:text-white">News</Link></li>
            <li><Link to="/gallery" className="hover:text-white">Gallery</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop" className="hover:text-white">Bookstore</Link></li>
            <li><Link to="/shop" className="hover:text-white">Bibles &amp; Study Guides</Link></li>
            <li><Link to="/shop" className="hover:text-white">Christian Music</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Ministry</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/admin/login" className="hover:text-white">Admin</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} AIMsisters. All rights reserved.
      </div>
    </footer>
  );
}
