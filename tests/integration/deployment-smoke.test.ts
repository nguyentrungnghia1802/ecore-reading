import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Production build and static deployment verification', () => {
  const distDir = resolve(process.cwd(), 'dist');
  const indexHtmlPath = resolve(distDir, 'index.html');

  beforeAll(() => {
    if (!existsSync(indexHtmlPath)) {
      execSync('npm run build', { stdio: 'pipe' });
    }
  }, 60_000);

  it('produces valid static distribution bundle', () => {
    expect(existsSync(indexHtmlPath), 'dist/index.html must exist after build').toBe(true);

    const html = readFileSync(indexHtmlPath, 'utf8');

    // Verify root container and essential elements exist
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<title>');
    expect(html).toContain('viewport');

    // Verify zero external network scripts or trackers
    expect(html).not.toMatch(/https?:\/\//i);
  });

  it('verifies privacy compliance: zero telemetry or tracking code in bundle', () => {
    const html = readFileSync(indexHtmlPath, 'utf8');

    expect(html).not.toContain('google-analytics');
    expect(html).not.toContain('googletagmanager');
    expect(html).not.toContain('mixpanel');
    expect(html).not.toContain('sentry');
  });
});
