/**
 * Domain resolution storage utilities
 * Manages storing and retrieving domain resolutions from extension storage
 */

const RESOLVED_DOMAINS_KEY = 'resolvedDomains';

export type ResolvedDomain = {
  domain: string;
  address: string;
  timestamp: number;
  chainId: string;
};

/**
 * Get all resolved domains from extension storage
 * @returns Map of domain names to their resolved addresses
 */
export async function getResolvedDomainsFromStorage(): Promise<
  Record<string, string>
> {
  try {
    // Access extension storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(RESOLVED_DOMAINS_KEY);
      return result[RESOLVED_DOMAINS_KEY] || {};
    }

    // Fallback to localStorage for testing
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(RESOLVED_DOMAINS_KEY);
      return stored ? JSON.parse(stored) : {};
    }

    return {};
  } catch (error) {
    console.error('Error reading resolved domains from storage:', error);
    return {};
  }
}

/**
 * Save a resolved domain to extension storage
 * @param domain - The domain name (e.g., "vitalik.eth")
 * @param address - The resolved Ethereum address
 * @param chainId - The chain ID where resolution occurred
 */
export async function saveResolvedDomainToStorage(
  domain: string,
  address: string,
  chainId: string,
): Promise<void> {
  try {
    // Get existing domains
    const existingDomains = await getResolvedDomainsFromStorage();

    // Add new domain (or update if exists)
    const updatedDomains = {
      ...existingDomains,
      [domain.toLowerCase()]: address.toLowerCase(),
    };

    // Save back to storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        [RESOLVED_DOMAINS_KEY]: updatedDomains,
      });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        RESOLVED_DOMAINS_KEY,
        JSON.stringify(updatedDomains),
      );
    }

    console.log(`Saved domain resolution: ${domain} -> ${address}`);
  } catch (error) {
    console.error('Error saving resolved domain to storage:', error);
  }
}

/**
 * Get all resolved domain names (without addresses)
 * @returns Array of domain names
 */
export async function getResolvedDomainNames(): Promise<string[]> {
  const domains = await getResolvedDomainsFromStorage();
  return Object.keys(domains);
}

/**
 * Check if a domain has been resolved before
 * @param domain - Domain name to check
 * @returns True if domain exists in storage
 */
export async function isDomainResolved(domain: string): Promise<boolean> {
  const domains = await getResolvedDomainsFromStorage();
  return domain.toLowerCase() in domains;
}

/**
 * Get the previously resolved address for a domain
 * @param domain - Domain name to check
 * @returns Previously resolved address or null if not found
 */
export async function getPreviouslyResolvedAddress(
  domain: string,
): Promise<string | null> {
  const domains = await getResolvedDomainsFromStorage();
  return domains[domain.toLowerCase()] || null;
}

/**
 * Clear all resolved domains from storage (for testing/debugging)
 */
export async function clearResolvedDomains(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove(RESOLVED_DOMAINS_KEY);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RESOLVED_DOMAINS_KEY);
    }
    console.log('Cleared all resolved domains from storage');
  } catch (error) {
    console.error('Error clearing resolved domains:', error);
  }
}
