export interface ParsedEcoreUriRef {
  raw: string;
  resourcePart: string | null;
  fragment: string | null;
  tokens: string[];
  hintedKind?: string;
}

function decodeToken(token: string): string {
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

export function parseEcoreUriRef(raw: string): ParsedEcoreUriRef {
  const trimmed = raw.trim();
  const hinted = /^(\S+:\S+)\s+(.+)$/.exec(trimmed);
  const hintedKind = hinted?.[1];
  const reference = hinted?.[2] ?? trimmed;
  const hashIndex = reference.indexOf('#');
  let resourcePart: string | null;
  let fragment: string | null;

  if (hashIndex >= 0) {
    resourcePart = reference.slice(0, hashIndex) || null;
    fragment = reference.slice(hashIndex + 1) || null;
  } else if (reference.startsWith('/')) {
    resourcePart = null;
    fragment = reference;
  } else {
    resourcePart = reference || null;
    fragment = null;
  }

  const tokens =
    fragment
      ?.replace(/^\/+/, '')
      .split('/')
      .filter(Boolean)
      .map(decodeToken) ?? [];

  return {
    raw,
    ...(hintedKind === undefined ? {} : { hintedKind }),
    resourcePart,
    fragment,
    tokens,
  };
}
