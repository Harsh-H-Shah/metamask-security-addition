import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Severity } from '../../../../../helpers/constants/design-system';
import { RowAlertKey } from '../../../../../components/app/confirm/info/row/constants';
import { getDomainDropCatchingWarning } from '../../../../../ducks/domains';

/**
 * Hook to detect domain drop catching attacks during transaction confirmation
 * Alerts when a domain now resolves to a different address than previously stored
 * @returns Array containing alert object if domain resolution changed, empty array otherwise
 */
export function useDomainDropCatchingAlert(): {
  key: string;
  field: string;
  severity: Severity;
  message: string;
  reason?: string;
  alertDetails?: string[];
}[] {
  // Get domain drop catching warning from domains state
  const domainDropCatchingWarning = useSelector(getDomainDropCatchingWarning);

  return useMemo(() => {
    // If no warning, return empty array
    if (!domainDropCatchingWarning) {
      return [];
    }

    const { warning } = domainDropCatchingWarning;

    return [
      {
        key: RowAlertKey.DomainDropCatching,
        field: RowAlertKey.DomainDropCatching,
        severity: Severity.Danger,
        message: 'Domain resolution has changed',
        reason: warning,
        alertDetails: [
          'The resolved address for this domain has changed since your last transaction.',
          'Please confirm with the domain owner that they still own it and have changed the address.',
        ],
      },
    ];
  }, [domainDropCatchingWarning]);
}
