import React, { useCallback, useRef, useState, useEffect } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalContentSize,
  Text,
  IconName,
  ButtonIcon,
  ButtonIconSize,
  HelpText,
  HelpTextSeverity,
} from '../../../../../components/component-library';
import {
  TextColor,
  TextVariant,
} from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { useRecipientSelectionMetrics } from '../../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useRecipientValidation } from '../../../hooks/send/useRecipientValidation';
import { useSendContext } from '../../../context/send';
import { useRecipients } from '../../../hooks/send/useRecipients';
import { RecipientList } from '../recipient-list';
import { RecipientInput } from '../recipient-input';
import { WindowHandles } from '../../../../../../test/e2e/background-socket/window-handles';

export const Recipient = ({
  recipientValidationResult,
}: {
  recipientValidationResult: ReturnType<typeof useRecipientValidation>;
}) => {
  const {
    recipientError,
    recipientWarning,
    recipientResolvedLookup,
    toAddressValidated,
    resolutionProtocol,
  } = recipientValidationResult;
  const t = useI18nContext();
  // NOTE: Address poisoning detection is handled by useAddressPoisoningAlert hook
  // in useConfirmationAlerts, no need to call it here separately
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const { to, updateTo, updateToResolved } = useSendContext();
  const {
    setRecipientInputMethodSelectContact,
    setRecipientInputMethodSelectAccount,
  } = useRecipientSelectionMetrics();
  const recipients = useRecipients();
  const recipientInputRef = useRef<HTMLInputElement>(null);

  const closeRecipientModal = useCallback(() => {
    setIsRecipientModalOpen(false);
  }, []);

  const openRecipientModal = useCallback(() => {
    recipientInputRef.current?.blur();
    setIsRecipientModalOpen(true);
  }, []);

  const onRecipientSelectedFromModal = useCallback(
    (address: string) => {
      const isRecipientContact = recipients.some(
        (recipient) =>
          recipient.address.toLowerCase() === address.toLowerCase() &&
          recipient.isContact,
      );
      if (isRecipientContact) {
        setRecipientInputMethodSelectContact();
      } else {
        setRecipientInputMethodSelectAccount();
      }

      updateTo(address);
    },
    [
      recipients,
      updateTo,
      setRecipientInputMethodSelectContact,
      setRecipientInputMethodSelectAccount,
    ],
  );

  useEffect(() => {
    updateToResolved(recipientResolvedLookup);
  }, [recipientResolvedLookup, updateToResolved]);

  useEffect(() => {
    if (
      !recipientResolvedLookup ||
      !toAddressValidated ||
      typeof window === 'undefined' ||
      typeof window.sessionStorage === 'undefined'
    ) {
      return;
    }

    const storageKey = 'resolvedAddresses';

    try {
      const existingValue = window.sessionStorage.getItem(storageKey);
      const resolvedEntries: Array<{
        input: string;
        resolved: string;
        protocol: string | null;
        updatedAt: number;
      }> = existingValue ? JSON.parse(existingValue) : [];

      const nextEntry = {
        input: toAddressValidated,
        resolved: recipientResolvedLookup,
        protocol: resolutionProtocol ?? null,
        updatedAt: Date.now(),
      };

      const existingIndex = resolvedEntries.findIndex(
        (entry) =>
          entry.input.toLowerCase() === toAddressValidated.toLowerCase() &&
          entry.resolved.toLowerCase() ===
            recipientResolvedLookup.toLowerCase(),
      );

      if (existingIndex === -1) {
        resolvedEntries.push(nextEntry);
      } else {
        resolvedEntries[existingIndex] = nextEntry;
      }
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(resolvedEntries),
      );
    } catch (error) {
      console.error('[Recipient] failed to persist resolved address', error);
    }
  }, [recipientResolvedLookup, toAddressValidated, resolutionProtocol]);

  return (
    <>
      <Text variant={TextVariant.bodyMdMedium} paddingBottom={1}>
        {t('to')}
      </Text>
      <RecipientInput
        openRecipientModal={openRecipientModal}
        recipientInputRef={recipientInputRef}
        recipientValidationResult={recipientValidationResult}
      />
      {to === toAddressValidated && recipientError && (
        <HelpText severity={HelpTextSeverity.Danger} marginTop={1}>
          {recipientError}
        </HelpText>
      )}
      {to === toAddressValidated && recipientWarning && (
        <HelpText severity={HelpTextSeverity.Warning} marginTop={1}>
          {recipientWarning}
        </HelpText>
      )}
      {to === toAddressValidated && recipientResolvedLookup && (
        <Text
          color={TextColor.textAlternative}
          marginTop={1}
          variant={TextVariant.bodyXs}
        >
          {t('resolutionProtocol', [resolutionProtocol ?? ''])}
        </Text>
      )}
      <Modal
        isClosedOnEscapeKey={true}
        isClosedOnOutsideClick={true}
        isOpen={isRecipientModalOpen}
        onClose={closeRecipientModal}
      >
        <ModalOverlay />
        <ModalContent size={ModalContentSize.Md}>
          <ModalHeader
            endAccessory={
              <ButtonIcon
                ariaLabel="Close recipient modal"
                data-testid="close-recipient-modal-btn"
                iconName={IconName.Close}
                onClick={closeRecipientModal}
                size={ButtonIconSize.Sm}
              />
            }
          >
            {t('selectRecipient')}
          </ModalHeader>
          <ModalBody paddingRight={0} paddingLeft={0}>
            <RecipientList
              hideModal={closeRecipientModal}
              onToChange={onRecipientSelectedFromModal}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
