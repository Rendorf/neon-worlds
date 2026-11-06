// Minimal stroke icons, 24x24, drawn for this app.
const svg = (body: string, fill = false) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  play: svg('<path d="M7 4.5v15l13-7.5z"/>', true),
  pause: svg('<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>', true),
  next: svg('<path d="M5 5l10 7-10 7z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>'),
  queue: svg('<path d="M4 6h12M4 12h12M4 18h8"/><path d="M18 15v6l4-3z" fill="currentColor" stroke="none"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  heart: svg('<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-3 4.6 4.6 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'),
  heartFill: svg('<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-3 4.6 4.6 0 0 1 9 3c-2 4.6-9 9-9 9z"/>', true),
  tour: svg('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>'),
  weather: svg('<path d="M7 17h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 17z"/><path d="M8 20l-1 2M12 20l-1 2M16 20l-1 2"/>'),
  radio: svg('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5"/><circle cx="15.5" cy="14" r="2.5"/><path d="M6.5 12h4M6.5 16h4"/>'),
  vibe: svg('<path d="M3 12h3l3-7 4 14 3-7h5"/>'),
  mixer: svg('<path d="M6 4v16M12 4v16M18 4v16"/><rect x="4" y="13" width="4" height="3" rx="1" fill="currentColor"/><rect x="10" y="7" width="4" height="3" rx="1" fill="currentColor"/><rect x="16" y="11" width="4" height="3" rx="1" fill="currentColor"/>'),
  music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  wind: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>'),
  timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  share: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'),
  pip: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor"/>'),
  fullscreen: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  passport: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>'),
  prev: svg('<path d="M15 5l-7 7 7 7"/>'),
  fwd: svg('<path d="M9 5l7 7-7 7"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
};

export type IconName = keyof typeof ICONS;
