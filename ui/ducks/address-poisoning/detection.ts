/**
 * Address Poisoning Detection System
 *
 * This module provides comprehensive detection of address poisoning attacks
 * where malicious actors send low-value transactions to users and then
 * trick them into sending funds to similar-looking addresses.
 */

// Type definitions
export interface Transaction {
  id: string;
  status: string;
  txParams: {
    from?: string;
    to?: string;
    value?: string;
  };
}

export interface InternalAccount {
  address: string;
}

export interface SimilarityResult {
  isSimilar: boolean;
  method: string | null;
}

export interface AddressPoisoningWarning {
  warning: boolean;
  title: string;
  message: string;
  details: {
    recipientAddress: string;
    suspiciousAddress: string;
    detectionMethod: string;
    txValue: string;
  };
  severity: string;
}

export interface MetamaskState {
  metamask: {
    useAddressPoisoningDetect?: boolean;
    transactions?: Transaction[];
    internalAccounts?: {
      accounts?: Record<string, any>;
      selectedAccount?: string;
    };
    [key: string]: unknown;
  };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

/**
 * Check if two addresses are suspiciously similar
 */
function areAddressesSimilar(
  address1: string,
  address2: string,
): SimilarityResult {
  if (!address1 || !address2) {
    return { isSimilar: false, method: null };
  }

  const addr1 = address1.toLowerCase();
  const addr2 = address2.toLowerCase();

  if (addr1 === addr2) {
    return { isSimilar: false, method: null };
  }

  // Method 1: Exact prefix + suffix matching (most common attack)
  const prefixSuffixTests = [
    { prefix: 6, suffix: 4 },
    { prefix: 8, suffix: 6 },
    { prefix: 10, suffix: 4 },
    { prefix: 6, suffix: 6 },
  ];

  for (const test of prefixSuffixTests) {
    const prefix1 = addr1.slice(0, test.prefix);
    const prefix2 = addr2.slice(0, test.prefix);
    const suffix1 = addr1.slice(-test.suffix);
    const suffix2 = addr2.slice(-test.suffix);
    const middle1 = addr1.slice(test.prefix, -test.suffix);
    const middle2 = addr2.slice(test.prefix, -test.suffix);

    if (prefix1 === prefix2 && suffix1 === suffix2 && middle1 !== middle2) {
      return {
        isSimilar: true,
        method: `prefix(${test.prefix})+suffix(${test.suffix})`,
      };
    }
  }

  // Method 2: High similarity (85%+)
  const similarity = calculateSimilarity(addr1, addr2);
  if (similarity >= 0.85) {
    return {
      isSimilar: true,
      method: `high-similarity(${(similarity * 100).toFixed(1)}%)`,
    };
  }

  // Method 3: Prefix similarity (first 12 chars, 80%+)
  const prefixSimilarity = calculateSimilarity(
    addr1.slice(0, 12),
    addr2.slice(0, 12),
  );
  if (prefixSimilarity >= 0.8) {
    return {
      isSimilar: true,
      method: `prefix-similarity(${(prefixSimilarity * 100).toFixed(1)}%)`,
    };
  }

  // Method 4: Suffix similarity (last 10 chars, 80%+)
  const suffixSimilarity = calculateSimilarity(
    addr1.slice(-10),
    addr2.slice(-10),
  );
  if (suffixSimilarity >= 0.8) {
    return {
      isSimilar: true,
      method: `suffix-similarity(${(suffixSimilarity * 100).toFixed(1)}%)`,
    };
  }

  return { isSimilar: false, method: null };
}

/**
 * Check if an address is potentially part of an address poisoning attack
 * This is the internal function that performs the actual detection logic
 */
function performDetection(
  recipientAddress: string,
  transactions: Transaction[],
  internalAccounts: InternalAccount[],
): AddressPoisoningWarning | null {
  console.log('[Address Poisoning] Starting detection check...', {
    recipientAddress,
    transactionCount: transactions?.length || 0,
    accountCount: internalAccounts?.length || 0,
  });

  if (!recipientAddress) {
    console.log('[Address Poisoning] No recipient address');
    return null;
  }

  const recipientLower = recipientAddress.toLowerCase();
  const ownAddresses = internalAccounts.map((account) =>
    account.address.toLowerCase(),
  );

  // Don't flag sending to own addresses
  if (ownAddresses.includes(recipientLower)) {
    console.log('[Address Poisoning] Sending to own address - safe');
    return null;
  }

  // Track addresses user has sent to
  const addressesSentTo = new Set<string>();

  // Collect all addresses encountered in transactions
  const addressesToCheck: Array<{
    address: string;
    value: number;
    valueETH: string;
    type: 'incoming' | 'outgoing';
  }> = [];

  // Analyze transactions to collect all addresses
  for (const tx of transactions) {
    if (!tx.txParams) continue;

    const { from, to, value } = tx.txParams;
    const fromLower = from?.toLowerCase();
    const toLower = to?.toLowerCase();
    const txValue = value ? parseInt(value, 16) : 0;

    // Track outgoing transactions (user sending TO someone)
    if (ownAddresses.includes(fromLower || '') && toLower) {
      addressesSentTo.add(toLower);
      addressesToCheck.push({
        address: toLower,
        value: txValue,
        valueETH: (txValue / 1e18).toFixed(6),
        type: 'outgoing',
      });
    }

    // Track incoming transactions (someone sending FROM this address TO user)
    if (ownAddresses.includes(toLower || '') && fromLower) {
      addressesToCheck.push({
        address: fromLower,
        value: txValue,
        valueETH: (txValue / 1e18).toFixed(6),
        type: 'incoming',
      });
    }
  }

  console.log('[Address Poisoning] Initial Analysis:', {
    totalAddressesChecked: addressesToCheck.length,
    addressesSentTo: addressesSentTo.size,
    recipient:
      recipientAddress.slice(0, 10) + '...' + recipientAddress.slice(-8),
  });

  // Check each address in transaction history for similarity with recipient
  const similarAddresses: Array<{
    address: string;
    type: 'incoming' | 'outgoing';
    value: number;
    valueETH: string;
    method: string;
  }> = [];

  for (const txAddress of addressesToCheck) {
    const similarityResult = areAddressesSimilar(
      recipientAddress,
      txAddress.address,
    );

    if (similarityResult.isSimilar) {
      console.log('[Address Poisoning] ✓ SIMILAR ADDRESS FOUND!', {
        recipient: recipientAddress,
        similarAddress: txAddress.address,
        type: txAddress.type,
        method: similarityResult.method,
        value: txAddress.valueETH + ' ETH',
      });

      similarAddresses.push({
        address: txAddress.address,
        type: txAddress.type,
        value: txAddress.value,
        valueETH: txAddress.valueETH,
        method: similarityResult.method || 'unknown',
      });
    }
  }

  // Log all found similar addresses
  if (similarAddresses.length > 0) {
    console.log('[Address Poisoning] Similar addresses found:', {
      count: similarAddresses.length,
      addresses: similarAddresses.map((addr) => ({
        address: addr.address,
        type: addr.type,
        valueETH: addr.valueETH,
        method: addr.method,
      })),
    });
  }

  // Future: Determine if we should display warning based on the similar addresses found
  // For now, just log all similar addresses for debugging
  if (similarAddresses.length === 0) {
    console.log(
      '[Address Poisoning] ✅ No similar addresses detected - recipient address appears safe',
    );
  }

  return null;
}

/**
 * Get address poisoning detection enabled status
 */
export function getAddressPoisoningDetectionEnabled(
  state: MetamaskState,
): boolean {
  return state.metamask.useAddressPoisoningDetect ?? true;
}

/**
 * Check for address poisoning using recipient address
 * Retrieves transactions and accounts from state internally
 */
export function checkForAddressPoisoningWithState(
  recipientAddress: string,
  state: MetamaskState,
): AddressPoisoningWarning | null {
  const detectionEnabled = getAddressPoisoningDetectionEnabled(state);

  if (!detectionEnabled) {
    console.log('[Address Poisoning] Detection disabled by user');
    return null;
  }

  if (!recipientAddress) {
    console.log('[Address Poisoning] No recipient address provided');
    return null;
  }

  // Get transactions from state
  const transactions = (state.metamask.transactions || []) as Transaction[];

  // Get internal accounts from state
  const internalAccounts: InternalAccount[] = state.metamask.internalAccounts
    ?.accounts
    ? Object.values(state.metamask.internalAccounts.accounts).map(
        (account: any) => ({
          address: account.address,
        }),
      )
    : [];

  console.log('[Address Poisoning] Retrieved from state:', {
    transactionCount: transactions.length,
    accountCount: internalAccounts.length,
  });

  // Perform the actual detection
  return performDetection(recipientAddress, transactions, internalAccounts);
}

/**
 * Check if an address is potentially part of an address poisoning attack
 * This function is used when transactions and accounts are passed explicitly
 */
export function checkForAddressPoisoning(
  recipientAddress: string,
  detectionEnabled: boolean,
  transactions: Transaction[],
  internalAccounts: InternalAccount[],
): AddressPoisoningWarning | null {
  if (!detectionEnabled) {
    console.log('[Address Poisoning] Detection disabled');
    return null;
  }

  return performDetection(recipientAddress, transactions, internalAccounts);
}
