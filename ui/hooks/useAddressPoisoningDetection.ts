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
  const state = useSelector((rootState: any) => rootState) as MetamaskState;

  const checkAddressPoison = useCallback(
    (recipientAddress: string) => {
      return checkForAddressPoisoningWithState(recipientAddress, state);
    },
    [state],
  );

  return checkAddressPoison;
}
