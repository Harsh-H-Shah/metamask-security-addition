/**
 * Address Poisoning Detection System
 *
 * Simplified version with straightforward checks:
 * 1. Check if recipient is user's own address
 * 2. Check if user has sent funds to recipient before
 * 3. Check if recipient has sent funds to user (any value) - REQUIRED for warning
 * 4. Check similarity with addresses user has sent funds to
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
 * Count matching characters between two strings at the same positions
 */
function countMatchingChars(str1: string, str2: string): number {
  let matches = 0;
  const minLen = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) {
      matches++;
    }
  }
  return matches;
}

/**
 * Check prefix similarity - returns number of matching characters
 */
function getPrefixMatchingChars(
  address1: string,
  address2: string,
  prefixLength: number = 10,
): number {
  const prefix1 = address1.slice(2, prefixLength);
  const prefix2 = address2.slice(2, prefixLength);
  return countMatchingChars(prefix1, prefix2);
}

/**
 * Check suffix similarity - returns number of matching characters
 */
function getSuffixMatchingChars(
  address1: string,
  address2: string,
  suffixLength: number = 10,
): number {
  const suffix1 = address1.slice(-suffixLength);
  const suffix2 = address2.slice(-suffixLength);
  return countMatchingChars(suffix1, suffix2);
}

/**
 * Simplified similarity check with 3-3 prefix-suffix threshold
 * and additional checks to catch any potential poisoning
 */
function areAddressesSimilar(address1: string, address2: string): boolean {
  if (!address1 || !address2) return false;

  const addr1 = address1.toLowerCase();
  const addr2 = address2.toLowerCase();

  if (addr1 === addr2) return false;

  // Calculate similarity metrics
  const prefixMatchCount = getPrefixMatchingChars(addr1, addr2, 10);
  const suffixMatchCount = getSuffixMatchingChars(addr1, addr2, 10);

  // Primary check: Exact 5-5 prefix-suffix match at same positions
  const prefix5 = addr1.slice(0, 5) === addr2.slice(0, 5);
  const suffix5 = addr1.slice(-5) === addr2.slice(-5);

  // Debug logging
  console.log('[Address Poisoning] Similarity check:', {
    addr1: addr1,
    addr2: addr2,
    prefix5: prefix5,
    suffix5: suffix5,
    prefixMatchCount: prefixMatchCount,
    suffixMatchCount: suffixMatchCount,
    combined: prefixMatchCount + suffixMatchCount,
  });

  if (prefix5 && suffix5) {
    console.log('[Address Poisoning] Match: exact 5-5 prefix-suffix');
    return true;
  }

  // Combined prefix + suffix similarity
  if (prefixMatchCount + suffixMatchCount >= 6) {
    console.log('[Address Poisoning] Match: combined similarity >= 6');
    return true;
  }

  console.log('[Address Poisoning] No similarity match');
  return false;
}

/**
 * Simplified detection logic
 */
function performDetection(
  recipientAddress: string,
  transactions: Transaction[],
  internalAccounts: InternalAccount[],
): AddressPoisoningWarning | null {
  console.log('[Address Poisoning] Starting simplified detection...', {
    recipientAddress,
    transactionCount: transactions?.length || 0,
  });

  if (!recipientAddress) {
    return null;
  }

  const recipientLower = recipientAddress.toLowerCase();
  const ownAddresses = internalAccounts.map((account) =>
    account.address.toLowerCase(),
  );

  // STEP 1: Check if recipient is user's own address
  if (ownAddresses.includes(recipientLower)) {
    console.log('[Address Poisoning] Recipient is own address - safe');
    return null;
  }

  // Collect addresses user has sent to and addresses that sent to user
  const addressesSentTo = new Set<string>();
  const addressesReceivedFrom = new Set<string>();

  for (const tx of transactions) {
    if (!tx.txParams || tx.status !== 'confirmed') continue;

    const { from, to, value } = tx.txParams;
    const fromLower = from?.toLowerCase();
    const toLower = to?.toLowerCase();
    const txValue = value ? parseInt(value, 16) : 0;

    // Track outgoing transactions (user sending TO someone)
    if (fromLower && ownAddresses.includes(fromLower) && toLower) {
      addressesSentTo.add(toLower);
    }

    // Track incoming transactions (someone sending TO user)
    if (toLower && ownAddresses.includes(toLower) && fromLower) {
      addressesReceivedFrom.add(fromLower);
    }
  }

  console.log('[Address Poisoning] Analysis results:', {
    addressesSentTo: Array.from(addressesSentTo),
    addressesReceivedFrom: Array.from(addressesReceivedFrom),
  });

  // STEP 2: Check if user has sent funds to this address before
  if (addressesSentTo.has(recipientLower)) {
    console.log(
      '[Address Poisoning] User has sent to this address before - safe',
    );
    return null;
  }

  // STEP 3: Check if this address has sent funds to user (any value)
  // THIS IS NOW REQUIRED - No warning if recipient never sent to user
  const hasReceivedFromRecipient = addressesReceivedFrom.has(recipientLower);

  if (!hasReceivedFromRecipient) {
    console.log(
      '[Address Poisoning] Recipient has never sent funds to user - no warning needed',
    );
    return null;
  }

  console.log(
    '[Address Poisoning] Recipient has sent funds to user before - checking for similarity with addresses sent to',
    {
      recipient: recipientLower,
      addressesToCheck: Array.from(addressesSentTo),
    },
  );

  // STEP 4: Check similarity with addresses user has sent funds to
  let foundSimilarAddress = false;
  let similarAddressFound = '';

  for (const sentToAddress of addressesSentTo) {
    const similarityResult = areAddressesSimilar(recipientLower, sentToAddress);

    if (similarityResult) {
      console.log('[Address Poisoning] Similar address found:', {
        recipient: recipientLower,
        similarTo: sentToAddress,
      });
      foundSimilarAddress = true;
      similarAddressFound = sentToAddress;
      break; // Found one similar address, no need to check others
    }
  }

  // Generate warning if similar address found
  if (foundSimilarAddress) {
    console.log('[Address Poisoning] ⚠️ POTENTIAL ADDRESS POISONING DETECTED!');

    return {
      warning: true,
      title: '⚠️ Possible Address Poisoning',
      message: `The address you're sending to (${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-6)}) looks very similar to an address you've sent funds to before (${similarAddressFound.slice(0, 8)}...${similarAddressFound.slice(-6)}). This could be an address poisoning attack. Please verify the full address carefully.`,
      details: {
        recipientAddress,
        txValue: 'Unknown',
      },
      severity: 'high',
    };
  }

  console.log('[Address Poisoning] ✅ No address poisoning detected');
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

  // Perform the simplified detection
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
