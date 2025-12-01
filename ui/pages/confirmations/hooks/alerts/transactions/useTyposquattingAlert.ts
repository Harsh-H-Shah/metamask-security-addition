import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Severity } from '../../../../../helpers/constants/design-system';
import { RowAlertKey } from '../../../../../components/app/confirm/info/row/constants';
import { getTyposquattingWarning } from '../../../../../ducks/domains';

/**
 * Hook to detect typosquatting attacks during transaction confirmation
 * Checks if the domain name being used is similar to previously used domains
 * @returns Array containing alert object if typosquatting detected, empty array otherwise
 */
export function useTyposquattingAlert(): {
  key: string;
  field: string;
  severity: Severity;
  message: string;
  reason?: string;
  alertDetails?: string[];
}[] {
  // Get typosquatting warning from domains state
  const typosquattingWarning = useSelector(getTyposquattingWarning);

  return useMemo(() => {
    // If no warning, return empty array
    if (!typosquattingWarning) {
      return [];
    }

    const { warning } = typosquattingWarning;

    return [
      {
        key: RowAlertKey.Typosquatting,
        field: RowAlertKey.Typosquatting,
        severity: Severity.Danger,
        message: 'Possible domain typo detected',
        reason: warning,
        alertDetails: [
          'Please double-check that you are sending to the correct domain.',
        ],
      },
    ];
  }, [typosquattingWarning]);
}
