// Primary color presets for Appearance Settings, applied as CSS variables.
export const COLOR_PRESETS: Record<string, { label: string; light: string; dark: string; lightFg: string }> = {
  emerald: { label: "เขียวมรกต", light: "oklch(0.52 0.12 168)", dark: "oklch(0.74 0.13 168)", lightFg: "oklch(0.985 0 0)" },
  blue: { label: "น้ำเงิน", light: "oklch(0.52 0.17 255)", dark: "oklch(0.72 0.14 255)", lightFg: "oklch(0.985 0 0)" },
  violet: { label: "ม่วง", light: "oklch(0.52 0.2 295)", dark: "oklch(0.74 0.15 295)", lightFg: "oklch(0.985 0 0)" },
  rose: { label: "ชมพูกุหลาบ", light: "oklch(0.57 0.2 15)", dark: "oklch(0.74 0.16 15)", lightFg: "oklch(0.985 0 0)" },
  amber: { label: "ส้มอำพัน", light: "oklch(0.74 0.16 70)", dark: "oklch(0.8 0.15 75)", lightFg: "oklch(0.2 0.02 60)" },
  graphite: { label: "กราไฟต์", light: "oklch(0.27 0.01 260)", dark: "oklch(0.9 0.01 260)", lightFg: "oklch(0.985 0 0)" },
};

export function applyTheme(color: string, theme: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = theme === "dark";
  root.classList.toggle("dark", dark);
  const p = COLOR_PRESETS[color] ?? COLOR_PRESETS.emerald;
  root.style.setProperty("--primary", dark ? p.dark : p.light);
  root.style.setProperty("--ring", dark ? p.dark : p.light);
  root.style.setProperty("--primary-foreground", dark ? "oklch(0.17 0.01 260)" : p.lightFg);
  try {
    localStorage.setItem("hub-theme", JSON.stringify({ color, theme }));
  } catch {
    /* ignore */
  }
}
