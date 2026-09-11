// ============================================================================
// 🎀 EDIT ME — this is the ONLY file you need to touch to personalize
// the birthday surprise. Every piece of text, every photo, every gif
// and the music file are all listed right here.
//
// Nothing else in the /Birthday folder needs to change.
// ============================================================================

// 1) Her name — used on the letter page ("Dear ___,")
export const HER_NAME = 'Bestie';

// 2) Background music.
//    Drop your song at:  Frontend/public/music/birthday-song.mp3
//    (any mp3 works — just keep this exact file name, or change the
//    path below to match the file you add.)
//    If the file isn't there yet, the music button will simply stay
//    in "add your song" mode — nothing breaks.
export const MUSIC_SRC = '/music/birthday-song.mp3';

// 3) GIF placeholders. Drop real gifs at these paths and they'll be used
//    automatically. Until then, a beautiful animated placeholder is shown
//    instead of a broken image.
export const GIFS = {
  celebration: '/gifs/celebration.gif',
  hearts: '/gifs/hearts.gif',
  reactions: '/gifs/reactions.gif',
  sparkles: '/gifs/sparkles.gif',
  balloons: '/gifs/balloons.gif',
};

// 4) Scene 1 — the mysterious opener
export const scene01 = {
  line1: 'Wait... 👀',
  line2: 'Someone has a birthday today...',
  button: '🎀 TAP TO FIND OUT 🎀',
};

// 5) Scene 2 — the reveal
export const scene02 = {
  big: "IT'S YOUR BIRTHDAY!!! 🎂💗",
  sub: 'Happy Birthday, my bestfriend. 🥹💕',
  button: '✨ Continue ✨',
};

// 6) Scene 3 — emotional introduction
export const scene03 = {
  lines: [
    'Before I say anything...',
    'There are some people who become memories, and some people become part of your story.',
    'You became part of mine. 💗',
  ],
  button: 'Keep going →',
};

// 7) Scene 4 — growing apart, but it still mattered
export const scene04 = {
  lines: [
    "We don't talk like we used to.",
    "We don't see each other like we used to.",
    'Life took us in different directions...',
    "But that doesn't erase what we once had.",
    'And honestly?',
    'I still remember. 🥹🩷',
  ],
  button: "There's more... 🎀",
};

// 8) Scene 5 — Memory Lane scrapbook intro + polaroids
//    Add/remove photos freely. `image` should point to a file in
//    Frontend/public/images/. Until you add a real photo there, a
//    beautiful styled placeholder polaroid is shown automatically.
export const memoryLane = {
  heading: 'Memory Lane 🎞️',
  sub: 'A little walk through some of my favorite moments with you...',
  photos: [
    { image: '/images/memory-01.jpg', caption: 'The day everything started 🩷' },
    { image: '/images/memory-02.jpg', caption: 'That trip we still talk about 😂' },
    { image: '/images/memory-03.jpg', caption: 'Us being ridiculous, as usual 💗' },
    { image: '/images/memory-04.jpg', caption: 'This one lives in my camera roll forever' },
  ],
  button: 'Keep exploring →',
};

// 9) Scene 6 — interactive memory cards
//    Click each card to flip it and reveal the message. Edit freely,
//    add more cards, remove some — the layout adjusts automatically.
export const memoryCards = [
  {
    emoji: '💗',
    title: 'The laughs',
    message: "The kind of laughing where you can't breathe and someone almost cries. That was us. Always.",
  },
  {
    emoji: '😂',
    title: 'The stupid conversations',
    message: 'Hours could disappear talking about absolutely nothing... and it was somehow the best part of my day.',
  },
  {
    emoji: '😭',
    title: 'The drama',
    message: "We survived it all — the chaos, the overthinking, the 2am voice notes. We really lived a whole show.",
  },
  {
    emoji: '🤦‍♀️',
    title: 'The random moments',
    message: 'The ones that made no sense to anyone else but us. Those are still my favorite kind of memory.',
  },
  {
    emoji: '🥹',
    title: 'The ones I wish I could relive',
    message: "If I could press play on one day with you again, I probably wouldn't know which one to choose.",
  },
];

// 10) Scene 7 — "if I could go back"
export const scene07 = {
  lines: [
    'If I could go back...',
    "I wouldn't change everything.",
    "I'd just stay a little longer.",
    'Laugh a little louder.',
    'Take a few more pictures.',
    'And make a few more memories.',
  ],
  button: 'Continue... 🥺',
};

// 11) Scene 8 — the letter. Replace this with your own words any time.
export const letter = {
  heading: `Dear ${HER_NAME},`,
  body: `Happy birthday, bestfriend. 🩷

It's crazy how much time can pass and how life can change.

But today I just wanted to create something that reminds you that, once upon a time, we were two girls making memories that I still remember.

I hope this new year of your life brings you happiness, peace, beautiful opportunities and people who genuinely love and appreciate you.

You deserve beautiful things.

Happy Birthday. 🎂💕`,
  signOff: '— your bestfriend, always 🎀',
  button: '🎁 One more thing...',
};

// 12) Scene 9 — the gift moment
export const scene09 = {
  teaser: 'I saved something for you... 👀',
  button: '🎁 OPEN YOUR GIFT 🎁',
  reveal: 'HAPPY BIRTHDAY!!! 🎂💗🎉',
  button2: 'See our memories →',
};

// 13) Scene 10 — final memory gallery
export const finalGallery = {
  intro: [
    'Before you go...',
    'I kept a few things here.',
    'Not because everything stayed the same...',
    'But because some moments are worth keeping. 🩷',
  ],
  heading: 'Our Little Memory Box 🩷',
  // Reuses memoryLane.photos by default — add as many as you like, this
  // is a completely separate list so the two galleries can differ.
  photos: [
    { image: '/images/memory-01.jpg', caption: 'The day everything started 🩷' },
    { image: '/images/memory-02.jpg', caption: 'That trip we still talk about 😂' },
    { image: '/images/memory-03.jpg', caption: 'Us being ridiculous, as usual 💗' },
    { image: '/images/memory-04.jpg', caption: 'This one lives in my camera roll forever' },
    { image: '/images/memory-05.jpg', caption: 'A completely unnecessary photoshoot 📸' },
    { image: '/images/memory-06.jpg', caption: 'Iconic behavior, honestly' },
  ],
  footer1: "Some memories don't need to happen yesterday to still mean something today. 💗",
  footer2: 'Happy Birthday, Bestfriend. 🎂',
};

// 14) Opening "start the journey" gate — this is the very first
// interaction. It's what starts the music (browsers block autoplay
// without a click), so keep a button here even if you change the copy.
export const startGate = {
  heading: 'Ready? 🎀',
  button: '🎵 Start the Journey',
  hint: 'Best with sound on 🎧',
};
