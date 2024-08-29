import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { NetworkConfiguration } from '@metamask/network-controller';
import {
  Box,
  Text,
  AvatarNetwork,
  AvatarNetworkSize,
  Button,
  Popover,
  PopoverPosition,
  ButtonVariant,
} from '../../../component-library';
import {
  AlignItems,
  BackgroundColor,
  Display,
  FlexDirection,
  TextColor,
  TextVariant,
  TextAlign,
  JustifyContent,
} from '../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { setEditedNetwork, toggleNetworkMenu } from '../../../../store/actions';
import { CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP } from '../../../../../shared/constants/network';
import { stripKeyFromInfuraUrl } from '../../../multichain/network-list-menu/rpc-list-item';

const NetworkListItem = ({
  networkConfiguration,
}: {
  networkConfiguration: NetworkConfiguration;
}) => {
  const rpcEndpoint =
    networkConfiguration.rpcEndpoints[
      networkConfiguration.defaultRpcEndpointIndex
    ];

  const t = useI18nContext();
  const [isOpenTooltip, setIsOpenTooltip] = useState(false);
  const dispatch = useDispatch();

  const [referenceElement, setReferenceElement] =
    useState<HTMLElement | null>();
  const setBoxRef = (anchorRef: HTMLElement | null) => {
    setReferenceElement(anchorRef);
  };

  const handleMouseEnter = () => {
    setIsOpenTooltip(true);
  };

  const handleMouseLeave = () => {
    setIsOpenTooltip(false);
  };

  return (
    <Box
      display={Display.Flex}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.spaceBetween}
      paddingBottom={4}
      paddingTop={4}
      className="new-network-list__list-of-networks"
    >
      <Box display={Display.Flex} alignItems={AlignItems.center}>
        <AvatarNetwork
          size={AvatarNetworkSize.Md}
          src={
            CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[
              networkConfiguration.chainId as keyof typeof CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP
            ]
          }
          name={networkConfiguration.name}
        />
        <Box display={Display.Flex} flexDirection={FlexDirection.Column}>
          <Box marginLeft={4}>
            <Text
              color={TextColor.textDefault}
              backgroundColor={BackgroundColor.transparent}
              ellipsis
            >
              {networkConfiguration.name}
            </Text>
          </Box>
          <Box
            className="multichain-network-list-item__rpc-endpoint"
            display={Display.Flex}
            alignItems={AlignItems.center}
            marginLeft={4}
          >
            <Text
              padding={0}
              backgroundColor={BackgroundColor.transparent}
              as="button"
              variant={TextVariant.bodySmMedium}
              color={TextColor.textAlternative}
              ref={setBoxRef}
              style={{ width: 220 }}
              textAlign={TextAlign.Left}
              onMouseLeave={handleMouseLeave}
              onMouseOver={handleMouseEnter}
            >
              {rpcEndpoint.name ?? new URL(rpcEndpoint.url).host}
            </Text>
            <Popover
              referenceElement={referenceElement}
              position={PopoverPosition.Bottom}
              isOpen={isOpenTooltip}
              matchWidth
              hasArrow
              flip
              backgroundColor={BackgroundColor.backgroundAlternative}
              paddingTop={2}
              paddingBottom={2}
            >
              <Text variant={TextVariant.bodyXsMedium} ellipsis>
                {stripKeyFromInfuraUrl(rpcEndpoint.url)}
              </Text>
            </Popover>
          </Box>
        </Box>
      </Box>

      <Box display={Display.Flex} alignItems={AlignItems.center} marginLeft={1}>
        <Button
          type="button"
          className="add-network__add-button"
          variant={ButtonVariant.Link}
          data-testid="test-add-button"
          onClick={() => {
            dispatch(
              toggleNetworkMenu({
                isAddingNewNetwork: false,
                isMultiRpcOnboarding: true,
              }),
            );
            dispatch(
              setEditedNetwork({
                chainId: networkConfiguration.chainId,
                nickname: networkConfiguration.name,
              }),
            );
          }}
        >
          {t('edit')}
        </Button>
      </Box>
    </Box>
  );
};

export default NetworkListItem;
