export type ThemeMode = 'system' | 'light' | 'dark';

export interface PreferencesV1 {
  version: 1;
  theme: ThemeMode;
  detailMode: 'overview' | 'standard' | 'detailed' | 'ecore';
  layoutProfile: string;
  minimapVisible: boolean;
  relationVisibility: Record<string, boolean>;
}

export const PREFERENCES_STORAGE_KEY = 'ecore-visualizer.preferences.v1';

export const DEFAULT_PREFERENCES: PreferencesV1 = {
  version: 1,
  theme: 'system',
  detailMode: 'standard',
  layoutProfile: 'hierarchy-down',
  minimapVisible: true,
  relationVisibility: {
    inheritance: true,
    containment: true,
    references: true,
    external: true,
  },
};

const VALID_THEMES = new Set<ThemeMode>(['system', 'light', 'dark']);
const VALID_DETAIL_MODES = new Set(['overview', 'standard', 'detailed', 'ecore']);

export function parsePreferences(raw: string | null): PreferencesV1 {
  if (!raw) return { ...DEFAULT_PREFERENCES };

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_PREFERENCES };
    }

    const candidate = parsed as Record<string, unknown>;
    if (candidate.version !== 1) {
      return { ...DEFAULT_PREFERENCES };
    }

    const theme: ThemeMode =
      typeof candidate.theme === 'string' && VALID_THEMES.has(candidate.theme as ThemeMode)
        ? (candidate.theme as ThemeMode)
        : DEFAULT_PREFERENCES.theme;

    const detailMode =
      typeof candidate.detailMode === 'string' && VALID_DETAIL_MODES.has(candidate.detailMode)
        ? (candidate.detailMode as PreferencesV1['detailMode'])
        : DEFAULT_PREFERENCES.detailMode;

    const layoutProfile =
      typeof candidate.layoutProfile === 'string' && candidate.layoutProfile.length > 0
        ? candidate.layoutProfile
        : DEFAULT_PREFERENCES.layoutProfile;

    const minimapVisible =
      typeof candidate.minimapVisible === 'boolean'
        ? candidate.minimapVisible
        : DEFAULT_PREFERENCES.minimapVisible;

    const relationVisibility: Record<string, boolean> = {
      ...DEFAULT_PREFERENCES.relationVisibility,
    };
    if (typeof candidate.relationVisibility === 'object' && candidate.relationVisibility !== null) {
      for (const [key, value] of Object.entries(candidate.relationVisibility)) {
        if (typeof value === 'boolean') {
          relationVisibility[key] = value;
        }
      }
    }

    return {
      version: 1,
      theme,
      detailMode,
      layoutProfile,
      minimapVisible,
      relationVisibility,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function loadPreferences(): PreferencesV1 {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_PREFERENCES };
  }
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return parsePreferences(raw);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: PreferencesV1): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    // Whitelist only explicit preference fields to guarantee no source model content leaks
    const sanitized: PreferencesV1 = {
      version: 1,
      theme: prefs.theme,
      detailMode: prefs.detailMode,
      layoutProfile: prefs.layoutProfile,
      minimapVisible: prefs.minimapVisible,
      relationVisibility: { ...prefs.relationVisibility },
    };
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

export function resolveEffectiveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}
