import {
  NetworkState as InternalNetworkState,
  RpcEndpointType,
} from '@metamask/network-controller';
import { createSelector } from 'reselect';
import { NetworkStatus } from '../../constants/network';
import { createDeepEqualSelector } from './util';

export type NetworkState = {
  metamask: { NetworkController: InternalNetworkState };
};

export type SelectedNetworkClientIdState = {
  metamask: {
    NetworkController: Pick<InternalNetworkState, 'selectedNetworkClientId'>;
  };
};

export type NetworkConfigurationsByChainIdState = {
  metamask: {
    NetworkController: Pick<
      InternalNetworkState,
      'networkConfigurationsByChainId'
    >;
  };
};

export type NetworksMetadataState = {
  metamask: {
    NetworkController: Pick<InternalNetworkState, 'networksMetadata'>;
  };
};

export type ProviderConfigState = NetworkConfigurationsByChainIdState &
  SelectedNetworkClientIdState;

export const getNetworkConfigurationsByChainId = createDeepEqualSelector(
  (state: NetworkConfigurationsByChainIdState) =>
    state.metamask.NetworkController.networkConfigurationsByChainId,
  (networkConfigurationsByChainId) => networkConfigurationsByChainId,
);

export function getSelectedNetworkClientId(
  state: SelectedNetworkClientIdState,
) {
  return state.metamask.NetworkController.selectedNetworkClientId;
}

/**
 * Get the provider configuration for the current selected network.
 *
 * @param state - Redux state object.
 * @throws `new Error('Provider configuration not found')` If the provider configuration is not found.
 */
export const getProviderConfig = createSelector(
  (state: ProviderConfigState) => getNetworkConfigurationsByChainId(state),
  getSelectedNetworkClientId,
  (networkConfigurationsByChainId, selectedNetworkClientId) => {
    for (const network of Object.values(networkConfigurationsByChainId)) {
      for (const rpcEndpoint of network.rpcEndpoints) {
        if (rpcEndpoint.networkClientId === selectedNetworkClientId) {
          const blockExplorerUrl =
            network.defaultBlockExplorerUrlIndex === undefined
              ? undefined
              : network.blockExplorerUrls?.[
                  network.defaultBlockExplorerUrlIndex
                ];

          return {
            chainId: network.chainId,
            ticker: network.nativeCurrency,
            rpcPrefs: { ...(blockExplorerUrl && { blockExplorerUrl }) },
            type:
              rpcEndpoint.type === RpcEndpointType.Custom
                ? 'rpc'
                : rpcEndpoint.networkClientId,
            ...(rpcEndpoint.type === RpcEndpointType.Custom && {
              id: rpcEndpoint.networkClientId,
              nickname: network.name,
              rpcUrl: rpcEndpoint.url,
            }),
          };
        }
      }
    }
    throw new Error('Provider configuration not found');
  },
);

/**
 * Returns true if the currently selected network is inaccessible or whether no
 * provider has been set yet for the currently selected network.
 *
 * @param state - Redux state object.
 */
export function isNetworkLoading(
  state: SelectedNetworkClientIdState & NetworksMetadataState,
) {
  const selectedNetworkClientId = getSelectedNetworkClientId(state);
  return (
    selectedNetworkClientId &&
    state.metamask.NetworkController.networksMetadata[selectedNetworkClientId]
      .status !== NetworkStatus.Available
  );
}

export function getInfuraBlocked(
  state: SelectedNetworkClientIdState & NetworksMetadataState,
) {
  return (
    state.metamask.NetworkController.networksMetadata[
      getSelectedNetworkClientId(state)
    ].status === NetworkStatus.Blocked
  );
}

export function getCurrentChainId(state: ProviderConfigState) {
  const { chainId } = getProviderConfig(state);
  return chainId;
}
