const svg = (body: string, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  play: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
  pause: svg('<rect x="7" y="5.5" width="3.2" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.8" y="5.5" width="3.2" height="13" rx="1" fill="currentColor" stroke="none"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
  chevron: svg('<path d="M6 15l6-6 6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  shape: svg('<path d="M12 3.5l4.5 7.5h-9z"/><circle cx="7.5" cy="16.5" r="3.5"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>'),
  sound: svg('<path d="M3 12h2M7 8v8M11 4v16M15 7v10M19 10v4M21 12h0"/>'),
  analysis: svg('<path d="M3 12h3.5l2.5-6 4 12 2.5-6H21"/>'),
  output: svg('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>'),
  midi: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7.5 6v7M12 6v7M16.5 6v7"/>'),
  mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
  file: svg('<path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};

/** Brand mark: a small vesica / seed motif inside a rounded tile (echoes the favicon). */
export const MARK = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--mark-bg)"/><g fill="none" stroke="var(--mark-line)" stroke-width="1.3"><circle cx="13.2" cy="16" r="6"/><circle cx="18.8" cy="16" r="6"/><circle cx="16" cy="16" r="10" stroke-opacity=".45"/></g></svg>`;
