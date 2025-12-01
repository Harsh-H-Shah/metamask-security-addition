export function damerauLevenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );

      if (
        i > 1 &&
        j > 1 &&
        str1[i - 1] === str2[j - 2] &&
        str1[i - 2] === str2[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[len1][len2];
}

export function areSimilarDomains(domain1: string, domain2: string): boolean {
  const d1 = domain1.toLowerCase().trim();
  const d2 = domain2.toLowerCase().trim();

  if (d1 === d2) {
    return false;
  }

  return damerauLevenshteinDistance(d1, d2) === 1;
}

/**
 * Find similar domains from a list
 * @param targetDomain - Domain to check
 * @param knownDomains - List of known domains
 * @returns Array of similar domains with their edit distances
 */
export function findSimilarDomains(
  targetDomain: string,
  knownDomains: string[],
): string[] {
  const target = targetDomain.toLowerCase().trim();
  const similar: string[] = [];

  for (const knownDomain of knownDomains) {
    const known = knownDomain.toLowerCase().trim();

    if (target === known) {
      continue;
    }

    if (areSimilarDomains(target, known)) {
      similar.push(knownDomain);
    }
  }

  return similar;
}

/**
 * Check if a domain is potentially a typosquatting attempt using advanced detection
 * @param domain - Domain to check
 * @param resolvedDomains - Map of previously resolved domains
 * @returns Warning object if typosquatting detected, null otherwise
 */
export function checkForTyposquatting(
  domain: string,
  resolvedDomains: Record<string, string>,
): {
  warning: string;
  suggestedDomain: string;
} | null {
  if (!domain || !resolvedDomains) {
    return null;
  }

  const knownDomains = Object.keys(resolvedDomains);
  if (knownDomains.length === 0) {
    return null;
  }

  const similarDomains = findSimilarDomains(domain, knownDomains);

  if (similarDomains.length > 0) {
    const suggestedDomain = similarDomains[0];

    return {
      warning: `This domain is similar to "${suggestedDomain}" you've interacted with before.`,
      suggestedDomain,
    };
  }

  return null;
}

/**
 * Check if a domain resolution has changed (domain drop catching attack)
 * @param domain - Domain to check
 * @param currentAddress - Currently resolved address
 * @param previousAddress - Previously resolved address from storage
 * @returns Warning object if address has changed, null otherwise
 */
export function checkForDomainDropCatching(
  domain: string,
  currentAddress: string,
  previousAddress: string | null,
): {
  warning: string;
  previousAddress: string;
  currentAddress: string;
} | null {
  if (!domain || !currentAddress || !previousAddress) {
    return null;
  }

  const normalizedCurrent = currentAddress.toLowerCase();
  const normalizedPrevious = previousAddress.toLowerCase();

  // If addresses are different, this is a potential domain drop catching attack
  if (normalizedCurrent !== normalizedPrevious) {
    return {
      warning: `The resolved address for "${domain}" has changed since your last transaction.`,
      previousAddress: normalizedPrevious,
      currentAddress: normalizedCurrent,
    };
  }

  return null;
}
