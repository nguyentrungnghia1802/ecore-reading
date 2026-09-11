import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  parsePreferences,
  PREFERENCES_STORAGE_KEY,
  savePreferences,
  type PreferencesV1,
} from './preferences';

describe('Preferences persistence and migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default preferences when storage is empty or null', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('parses valid preferences adhering to schema v1', () => {
    const custom: PreferencesV1 = {
      version: 1,
      theme: 'dark',
      detailMode: 'detailed',
      layoutProfile: 'hierarchy-right',
      minimapVisible: false,
      relationVisibility: {
        inheritance: true,
        containment: false,
        references: true,
        external: false,
      },
    };

    savePreferences(custom);
    const loaded = loadPreferences();
    expect(loaded).toEqual(custom);
  });

  it('defensively falls back to defaults when encountering malformed JSON', () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, '{ broken json ...');
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('defensively falls back to defaults on version mismatch', () => {
    const oldVersion = JSON.stringify({ version: 999, theme: 'dark' });
    expect(parsePreferences(oldVersion)).toEqual(DEFAULT_PREFERENCES);
  });

  it('sanitizes invalid enum values and falls back safely per-field', () => {
    const invalidValues = JSON.stringify({
      version: 1,
      theme: 'neon-cyberpunk', // invalid theme
      detailMode: 'super-ultra', // invalid detail mode
      minimapVisible: 'not-a-boolean', // invalid type
      relationVisibility: {
        inheritance: false,
      },
    });

    const parsed = parsePreferences(invalidValues);
    expect(parsed.theme).toBe('system');
    expect(parsed.detailMode).toBe('standard');
    expect(parsed.minimapVisible).toBe(true);
    expect(parsed.relationVisibility.inheritance).toBe(false);
  });

  it('ensures savePreferences writes only whitelisted settings and never leaks model data', () => {
    const withExtraFields = {
      ...DEFAULT_PREFERENCES,
      theme: 'light',
      // Attempt to inject sensitive/model data
      sourceContent: '<?xml ... secret model data ... ?>',
      classifierNames: ['SecretAccount', 'InternalToken'],
      searchHistory: ['CreditCard'],
    };

    savePreferences(withExtraFields as unknown as PreferencesV1);

    const rawInStorage = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    expect(rawInStorage).not.toBeNull();
    expect(rawInStorage).not.toContain('secret model data');
    expect(rawInStorage).not.toContain('SecretAccount');
    expect(rawInStorage).not.toContain('CreditCard');

    const parsed = JSON.parse(rawInStorage ?? '{}') as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('sourceContent');
    expect(parsed).not.toHaveProperty('classifierNames');
    expect(parsed).not.toHaveProperty('searchHistory');
    expect(parsed['theme']).toBe('light');
  });
});
