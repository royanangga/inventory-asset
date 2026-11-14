/** Preferensi tampilan (tema & mode privasi) — disimpan di localStorage dan diterapkan lewat atribut <html>. */
export type Theme = "light" | "dark";

export const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
export const getPrivacy = (): boolean => document.documentElement.dataset.privacy === "on";

function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* penyimpanan diblokir: abaikan */ }
  window.dispatchEvent(new Event("prefs-change"));
}
export function setTheme(t: Theme) { document.documentElement.dataset.theme = t; save("theme", t); }
export function toggleTheme() { setTheme(getTheme() === "dark" ? "light" : "dark"); }
export function setPrivacy(on: boolean) { document.documentElement.dataset.privacy = on ? "on" : "off"; save("privacy", on ? "on" : "off"); }
export function togglePrivacy() { setPrivacy(!getPrivacy()); }
