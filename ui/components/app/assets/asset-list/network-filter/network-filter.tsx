import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTokenNetworkFilter } from '../../../../../store/actions';
import {
  getCurrentChainId,
  getCurrentNetwork,
  getPreferences,
  getSelectedInternalAccount,
  getShouldHideZeroBalanceTokens,
  getNetworkConfigurationsByChainId,
} from '../../../../../selectors';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { SelectableListItem } from '../sort-control/sort-control';
import { Text } from '../../../../component-library/text/text';
import {
  Display,
  JustifyContent,
  TextColor,
  TextVariant,
} from '../../../../../helpers/constants/design-system';
import { Box } from '../../../../component-library/box/box';
import { AvatarNetwork } from '../../../../component-library';
import UserPreferencedCurrencyDisplay from '../../../user-preferenced-currency-display';
import { CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP } from '../../../../../../shared/constants/network';
import { useGetFormattedTokensPerChain } from '../../../../../hooks/useGetFormattedTokensPerChain';
import { useAccountTotalCrossChainFiatBalance } from '../../../../../hooks/useAccountTotalCrossChainFiatBalance';

type SortControlProps = {
  handleClose: () => void;
};

const NetworkFilter = ({ handleClose }: SortControlProps) => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const chainId = useSelector(getCurrentChainId);
  const selectedAccount = useSelector(getSelectedInternalAccount);
  const currentNetwork = useSelector(getCurrentNetwork);
  const allNetworks = useSelector(getNetworkConfigurationsByChainId);
  const { tokenNetworkFilter } = useSelector(getPreferences);
  const shouldHideZeroBalanceTokens = useSelector(
    getShouldHideZeroBalanceTokens,
  );

  const { formattedTokensWithBalancesPerChain } = useGetFormattedTokensPerChain(
    selectedAccount,
    shouldHideZeroBalanceTokens,
    true, // true to get formattedTokensWithBalancesPerChain for the current chain
  );
  const { totalFiatBalance: selectedAccountBalance } =
    useAccountTotalCrossChainFiatBalance(
      selectedAccount,
      formattedTokensWithBalancesPerChain,
    );

  const { formattedTokensWithBalancesPerChain: formattedTokensForAllNetworks } =
    useGetFormattedTokensPerChain(
      selectedAccount,
      shouldHideZeroBalanceTokens,
      false, // false to get the value for all networks
    );
  const { totalFiatBalance: selectedAccountBalanceForAllNetworks } =
    useAccountTotalCrossChainFiatBalance(
      selectedAccount,
      formattedTokensForAllNetworks,
    );

  // TODO: fetch balances across networks
  // const multiNetworkAccountBalance = useMultichainAccountBalance()

  const handleFilter = (chainFilters: Record<string, boolean>) => {
    dispatch(setTokenNetworkFilter(chainFilters));

    // TODO Add metrics
    handleClose();
  };

  return (
    <>
      <SelectableListItem
        isSelected={!Object.keys(tokenNetworkFilter).length}
        onClick={() => handleFilter({})}
      >
        <Box
          display={Display.Flex}
          justifyContent={JustifyContent.spaceBetween}
        >
          <Box>
            <Text
              variant={TextVariant.bodyMdMedium}
              color={TextColor.textDefault}
            >
              {t('allNetworks')}
            </Text>
            <Text
              variant={TextVariant.bodyMdMedium}
              color={TextColor.textDefault}
            >
              {/* TODO: Should query cross chain account balance */}

              <UserPreferencedCurrencyDisplay
                value={selectedAccountBalanceForAllNetworks}
                type="PRIMARY"
                ethNumberOfDecimals={4}
                hideTitle
                showFiat
                isAggregatedFiatOverviewBalance
              />
            </Text>
          </Box>
          <Box display={Display.Flex}>
            {Object.values(allNetworks)
              .slice(0, 5) // only show a max of 5 icons overlapping
              .map((network, index) => {
                const networkImageUrl =
                  CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[
                    network.chainId as keyof typeof CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP
                  ];
                return (
                  <AvatarNetwork
                    key={network.chainId}
                    name="All"
                    src={networkImageUrl ?? undefined}
                    // overlap the icons
                    style={{
                      marginLeft: index === 0 ? 0 : '-20px',
                      zIndex: 5 - index,
                    }}
                  />
                );
              })}
          </Box>
        </Box>
      </SelectableListItem>
      <SelectableListItem
        isSelected={tokenNetworkFilter[chainId]}
        onClick={() => handleFilter({ [chainId]: true })}
      >
        <Box
          display={Display.Flex}
          justifyContent={JustifyContent.spaceBetween}
        >
          <Box>
            <Text
              variant={TextVariant.bodyMdMedium}
              color={TextColor.textDefault}
            >
              {t('currentNetwork')}
            </Text>
            <Text
              variant={TextVariant.bodySmMedium}
              color={TextColor.textAlternative}
            >
              <UserPreferencedCurrencyDisplay
                value={selectedAccountBalance}
                type="PRIMARY"
                ethNumberOfDecimals={4}
                hideTitle
                showFiat
                isAggregatedFiatOverviewBalance
              />
            </Text>
          </Box>
          <AvatarNetwork
            name="Current"
            src={currentNetwork?.rpcPrefs?.imageUrl}
          />
        </Box>
      </SelectableListItem>
    </>
  );
};

export default NetworkFilter;
