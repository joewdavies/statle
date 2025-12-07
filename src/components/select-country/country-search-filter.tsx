// --- keep normalize, ABBREV_EXPANSIONS, levenshtein as before ---
// (omit here for brevity — keep your existing implementations)

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]/gu, '')
    .trim();

export const ABBREV_EXPANSIONS: Record<string, string> = {
  st: 'saint',
  'st.': 'saint',
  // add more as needed
};

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_) =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// --- core: check if a single query token matches any target token ---
function tokenMatches(queryToken: string, targetTokens: string[]): boolean {
  if (!queryToken) return true;

  // direct substring
  if (targetTokens.some((t) => t.includes(queryToken))) return true;

  // start-of-token match
  if (targetTokens.some((t) => t.startsWith(queryToken))) return true;

  // abbreviation expansion e.g. 'st' -> 'saint'
  const expanded = ABBREV_EXPANSIONS[queryToken];
  if (expanded && targetTokens.some((t) => t.startsWith(expanded))) return true;

  // small fuzzy tolerance for short tokens
  if (queryToken.length <= 3) {
    if (
      targetTokens.some((t) =>
        levenshtein(queryToken, t.slice(0, Math.max(queryToken.length, 3))) <= 1
      )
    ) {
      return true;
    }
  }

  return false;
}

// --- tokenized fuzzy filter for Mantine Autocomplete -----------------------
export function fuzzyCountryFilter({ options, search, limit }: any) {
  const qRaw = search.trim();
  if (!qRaw) return options.slice(0, limit);

  // split query into tokens, normalize each
  const qTokens = qRaw
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

  // build expanded candidates for each token (token + expansion if present)
  const qTokenCandidates: string[][] = qTokens.map((t:any) =>
    ABBREV_EXPANSIONS[t] ? [t, ABBREV_EXPANSIONS[t]] : [t]
  );

  const filtered = options.filter((item: any) => {
    const nameTokens = normalize(item.value).split(/\s+/).filter(Boolean);
    const keywordTokens = normalize(item.keywords || '').split(/\s+/).filter(Boolean);

    // aggregate all searchable tokens
    const targetTokens = Array.from(new Set([...nameTokens, ...keywordTokens]));

    // require that every query token has at least one match in the target tokens
    const allMatched = qTokenCandidates.every((candidatesForToken) =>
      // a token's candidate matches if any candidate matches any target token
      candidatesForToken.some((candidate) => tokenMatches(candidate, targetTokens))
    );

    return allMatched;
  });

  return filtered.slice(0, limit);
}
