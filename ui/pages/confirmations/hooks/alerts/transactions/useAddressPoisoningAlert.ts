/**
 * Hook to detect and create address poisoning alerts
 * Alerts user if the recipient address is similar to an address from transaction history
 * and the user has never sent funds to the recipient before
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { Alert } from '../../../../../ducks/confirm-alerts/confirm-alerts';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { Severity } from '../../../../../helpers/constants/design-system';
import { RowAlertKey } from '../../../../../components/app/confirm/info/row/constants';
import { useConfirmContext } from '../../../context/confirm';
import { getInternalAccounts } from '../../../../../selectors';
import { useTransferRecipient } from '../../../components/confirm/info/hooks/useTransferRecipient';
import { checkForAddressPoisoningWithState } from '../../../../../ducks/address-poisoning';

export function useAddressPoisoningAlert(): Alert[] {
  const t = useI18nContext();
  const { currentConfirmation } = useConfirmContext<TransactionMeta>();
  const internalAccounts = useSelector(getInternalAccounts);

  // Select only specific transaction-related data
  const transactions = useSelector(
    (rootState: any) => rootState?.metamask?.transactions,
  );
  const useAddressPoisoningDetect = useSelector(
    (rootState: any) => rootState?.metamask?.useAddressPoisoningDetect,
  );

  const to = useTransferRecipient();
  const { txParams, isFirstTimeInteraction } = currentConfirmation ?? {};
  const recipient = (txParams?.to ?? '0x') as Hex;

  // Use ref to store cached alert result - prevents re-detection
  const cacheRef = useRef<Alert[]>([]);
  const lastRecipientRef = useRef<string>('');

  // Early exit if basic validation fails
  if (
    !recipient ||
    recipient === '0x' ||
    !isFirstTimeInteraction ||
    !useAddressPoisoningDetect ||
    !transactions ||
    transactions.length === 0
  ) {
    return [];
  }

  // Check if user is sending to own account
  const isInternalAccount = internalAccounts.some(
    (account) => account.address?.toLowerCase() === to?.toLowerCase(),
  );

  if (isInternalAccount) {
    return [];
  }

  // Return cached result if recipient hasn't changed
  if (recipient.toLowerCase() === lastRecipientRef.current.toLowerCase()) {
    return cacheRef.current;
  }

  // Run detection only when recipient changes
  const state = {
    metamask: {
      transactions,
      internalAccounts: { accounts: internalAccounts },
      useAddressPoisoningDetect,
    },
  };

  const warning = checkForAddressPoisoningWithState(recipient, state as any);

  // Create alert if needed
  let alertResult: Alert[] = [];
  if (warning) {
    alertResult = [
      {
        actions: [],
        field: RowAlertKey.InteractingWith,
        isBlocking: false,
        key: 'addressPoisoningTitle',
        message: t('alertMessageAddressPoison'),
        reason: t('alertReasonAddressPoison'),
        severity: Severity.Danger,
      },
    ];
  }

  // Update cache
  cacheRef.current = alertResult;
  lastRecipientRef.current = recipient;

  return alertResult;
}
