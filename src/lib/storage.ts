import type { SavedNotice } from "./types";

const KEY = "campuscue.notices.v1";

export function loadNotices(): SavedNotice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedNotice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotices(notices: SavedNotice[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(notices));
}

export function upsertNotice(notice: SavedNotice): SavedNotice[] {
  const all = loadNotices();
  const idx = all.findIndex((n) => n.id === notice.id);
  if (idx >= 0) all[idx] = notice;
  else all.unshift(notice);
  saveNotices(all);
  return all;
}

export function removeNotice(id: string): SavedNotice[] {
  const all = loadNotices().filter((n) => n.id !== id);
  saveNotices(all);
  return all;
}
