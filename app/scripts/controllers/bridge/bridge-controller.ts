import { StateMetadata } from '@metamask/base-controller';
import { add0x, Hex } from '@metamask/utils';
import { StaticIntervalPollingController } from '@metamask/polling-controller';
import { NetworkClientId } from '@metamask/network-controller';
import {
  fetchBridgeFeatureFlags,
  fetchBridgeQuotes,
  fetchBridgeTokens,
  // TODO: Remove restricted import
  // eslint-disable-next-line import/no-restricted-paths
} from '../../../../ui/pages/bridge/bridge.util';
// TODO: Remove restricted import
// eslint-disable-next-line import/no-restricted-paths
import { fetchTopAssetsList } from '../../../../ui/pages/swaps/swaps.util';
import { decimalToHex } from '../../../../shared/modules/conversion.utils';
// TODO: Remove restricted import
// eslint-disable-next-line import/no-restricted-paths
import { QuoteRequest } from '../../../../ui/pages/bridge/types';
// TODO: Remove restricted import
// eslint-disable-next-line import/no-restricted-paths
import { isValidQuoteRequest } from '../../../../ui/pages/bridge/utils/quote';
import { hasSufficientBalance } from '../../../../shared/modules/bridge-utils/balance';
import {
  BRIDGE_CONTROLLER_NAME,
  DEFAULT_BRIDGE_CONTROLLER_STATE,
  REFRESH_INTERVAL_MS,
  RequestStatus,
} from './constants';
import {
  BridgeControllerState,
  BridgeControllerMessenger,
  BridgeFeatureFlagsKey,
} from './types';

const metadata: StateMetadata<{ bridgeState: BridgeControllerState }> = {
  bridgeState: {
    persist: false,
    anonymous: false,
  },
};

const RESET_STATE_ABORT_MESSAGE = 'Reset controller state';

export default class BridgeController extends StaticIntervalPollingController<
  typeof BRIDGE_CONTROLLER_NAME,
  { bridgeState: BridgeControllerState },
  BridgeControllerMessenger
> {
  #abortController: AbortController | undefined;

  constructor({ messenger }: { messenger: BridgeControllerMessenger }) {
    super({
      name: BRIDGE_CONTROLLER_NAME,
      metadata,
      messenger,
      state: {
        bridgeState: DEFAULT_BRIDGE_CONTROLLER_STATE,
      },
    });

    this.setIntervalLength(REFRESH_INTERVAL_MS);

    this.messagingSystem.registerActionHandler(
      `${BRIDGE_CONTROLLER_NAME}:setBridgeFeatureFlags`,
      this.setBridgeFeatureFlags.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      `${BRIDGE_CONTROLLER_NAME}:selectSrcNetwork`,
      this.selectSrcNetwork.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      `${BRIDGE_CONTROLLER_NAME}:selectDestNetwork`,
      this.selectDestNetwork.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      `${BRIDGE_CONTROLLER_NAME}:updateBridgeQuoteRequestParams`,
      this.updateBridgeQuoteRequestParams.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      `${BRIDGE_CONTROLLER_NAME}:resetState`,
      this.resetState.bind(this),
    );
  }

  _executePoll = async (
    _: NetworkClientId,
    updatedQuoteRequest: QuoteRequest,
  ) => {
    await this.#fetchBridgeQuotes(updatedQuoteRequest);
  };

  updateBridgeQuoteRequestParams = async (
    paramsToUpdate: Partial<QuoteRequest>,
  ) => {
    this.stopAllPolling();
    this.#abortController?.abort('Quote request updated');

    const { bridgeState } = this.state;
    const updatedQuoteRequest = {
      ...DEFAULT_BRIDGE_CONTROLLER_STATE.quoteRequest,
      ...paramsToUpdate,
    };

    this.update((_state) => {
      _state.bridgeState = {
        ...bridgeState,
        quoteRequest: updatedQuoteRequest,
        quotes: DEFAULT_BRIDGE_CONTROLLER_STATE.quotes,
        quotesLastFetched: DEFAULT_BRIDGE_CONTROLLER_STATE.quotesLastFetched,
        quotesLoadingStatus:
          DEFAULT_BRIDGE_CONTROLLER_STATE.quotesLoadingStatus,
        quotesRefreshCount: DEFAULT_BRIDGE_CONTROLLER_STATE.quotesRefreshCount,
      };
    });

    if (isValidQuoteRequest(updatedQuoteRequest)) {
      const walletAddress = this.#getSelectedAccount().address;
      const srcChainIdInHex = add0x(
        decimalToHex(updatedQuoteRequest.srcChainId),
      );

      const insufficientBal =
        paramsToUpdate.insufficientBal ||
        !(await this.#hasSufficientBalance(updatedQuoteRequest));

      this.startPollingByNetworkClientId(srcChainIdInHex, {
        ...updatedQuoteRequest,
        walletAddress,
        insufficientBal,
      });
    }
  };

  #hasSufficientBalance = async (quoteRequest: QuoteRequest) => {
    const walletAddress = this.#getSelectedAccount().address;
    const srcChainIdInHex = add0x(decimalToHex(quoteRequest.srcChainId));
    const provider = this.#getSelectedNetworkClient()?.provider;

    return (
      provider &&
      (await hasSufficientBalance(
        provider,
        walletAddress,
        quoteRequest.srcTokenAddress,
        quoteRequest.srcTokenAmount,
        srcChainIdInHex,
      ))
    );
  };

  resetState = () => {
    this.stopAllPolling();
    this.#abortController?.abort(RESET_STATE_ABORT_MESSAGE);

    this.update((_state) => {
      _state.bridgeState = {
        ...DEFAULT_BRIDGE_CONTROLLER_STATE,
        quotes: [],
        bridgeFeatureFlags: _state.bridgeState.bridgeFeatureFlags,
      };
    });
  };

  setBridgeFeatureFlags = async () => {
    const { bridgeState } = this.state;
    const bridgeFeatureFlags = await fetchBridgeFeatureFlags();
    this.update((_state) => {
      _state.bridgeState = { ...bridgeState, bridgeFeatureFlags };
    });
    this.setIntervalLength(
      bridgeFeatureFlags[BridgeFeatureFlagsKey.EXTENSION_CONFIG].refreshRate,
    );
  };

  selectSrcNetwork = async (chainId: Hex) => {
    await this.#setTopAssets(chainId, 'srcTopAssets');
    await this.#setTokens(chainId, 'srcTokens');
  };

  selectDestNetwork = async (chainId: Hex) => {
    await this.#setTopAssets(chainId, 'destTopAssets');
    await this.#setTokens(chainId, 'destTokens');
  };

  #fetchBridgeQuotes = async (request: QuoteRequest) => {
    this.#abortController?.abort('New quote request');
    this.#abortController = new AbortController();
    if (request.srcChainId === request.destChainId) {
      return;
    }
    const { bridgeState } = this.state;
    this.update((_state) => {
      _state.bridgeState = {
        ...bridgeState,
        quotesLoadingStatus: RequestStatus.LOADING,
        quoteRequest: request,
      };
    });
    const { maxRefreshCount } =
      bridgeState.bridgeFeatureFlags[BridgeFeatureFlagsKey.EXTENSION_CONFIG];
    const newQuotesRefreshCount = bridgeState.quotesRefreshCount + 1;

    try {
      const quotes = await fetchBridgeQuotes(
        request,
        this.#abortController.signal,
      );

      // Stop polling if the maximum number of refreshes has been reached
      if (
        (request.insufficientBal && newQuotesRefreshCount >= 1) ||
        (!request.insufficientBal && newQuotesRefreshCount >= maxRefreshCount)
      ) {
        this.stopAllPolling();
      }

      this.update((_state) => {
        _state.bridgeState = {
          ..._state.bridgeState,
          quotes,
          quotesLastFetched: Date.now(),
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotesRefreshCount: newQuotesRefreshCount,
        };
      });
    } catch (error) {
      const isAbortError = (error as Error).name === 'AbortError';
      const isAbortedDueToReset = error === RESET_STATE_ABORT_MESSAGE;
      if (isAbortedDueToReset || isAbortError) {
        return;
      }

      this.update((_state) => {
        _state.bridgeState = {
          ...bridgeState,
          quotesLoadingStatus: RequestStatus.ERROR,
          quotesRefreshCount: newQuotesRefreshCount,
        };
      });
      console.log('Failed to fetch bridge quotes', error);
    }
  };

  #setTopAssets = async (
    chainId: Hex,
    stateKey: 'srcTopAssets' | 'destTopAssets',
  ) => {
    const { bridgeState } = this.state;
    const topAssets = await fetchTopAssetsList(chainId);
    this.update((_state) => {
      _state.bridgeState = { ...bridgeState, [stateKey]: topAssets };
    });
  };

  #setTokens = async (chainId: Hex, stateKey: 'srcTokens' | 'destTokens') => {
    const { bridgeState } = this.state;
    const tokens = await fetchBridgeTokens(chainId);
    this.update((_state) => {
      _state.bridgeState = { ...bridgeState, [stateKey]: tokens };
    });
  };

  #getSelectedAccount() {
    return this.messagingSystem.call('AccountsController:getSelectedAccount');
  }

  #getSelectedNetworkClient() {
    return this.messagingSystem.call(
      'NetworkController:getSelectedNetworkClient',
    );
  }
}
