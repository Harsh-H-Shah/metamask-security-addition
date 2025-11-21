/**
 * Hook for detecting address poisoning in the send confirmation flow
 */

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { checkForAddressPoisoningWithState } from '../ducks/address-poisoning';
import type { MetamaskState } from '../ducks/address-poisoning';

/**
 * Hook to check for address poisoning
 * @returns Function to check if recipient address is a potential poisoning attack
 */
export function useAddressPoisoningDetection() {
  // Select only specific state slices to prevent unnecessary re-renders
  const transactions = useSelector(
    (rootState: any) => rootState?.metamask?.transactions,
  );
  const internalAccounts = useSelector(
    (rootState: any) => rootState?.metamask?.internalAccounts?.accounts,
  );
  const useAddressPoisoningDetect = useSelector(
    (rootState: any) => rootState?.metamask?.useAddressPoisoningDetect,
  );

  const checkAddressPoison = useCallback(
    (recipientAddress: string) => {
      // Construct a minimal state object with only needed slices
      const state: MetamaskState = {
        metamask: {
          transactions,
          internalAccounts: { accounts: internalAccounts },
          useAddressPoisoningDetect,
        },
      };
      return checkForAddressPoisoningWithState(recipientAddress, state);
    },
    [transactions, internalAccounts, useAddressPoisoningDetect],
  );

  return checkAddressPoison;
}
