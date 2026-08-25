import React from 'react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-bold mb-6">About AIMsisters</h1>
      <p className="text-ink/70 leading-relaxed mb-6">
        AIMsisters exists to share the Everlasting Gospel by providing Bible-centered digital resources through
        modern technology. We believe the message of Christ's soon return and everlasting love belongs in every
        hand, on every device.
      </p>
      <p className="text-ink/70 leading-relaxed mb-6">
        Through Bible studies, devotions, ministry news, and a Christian bookstore, our platform supports visitors
        in their spiritual growth while equipping ministry administrators with powerful tools to create, organize,
        and distribute Christian content effectively.
      </p>
      <div className="glass-card p-8 mt-10">
        <h2 className="text-xl font-bold mb-3">Our Mission</h2>
        <p className="text-ink/70">
          To proclaim the Everlasting Gospel using every tool technology provides — faithfully, clearly, and with love.
        </p>
      </div>
    </div>
  );
}
