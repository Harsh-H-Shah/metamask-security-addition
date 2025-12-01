import { createSlice } from '@reduxjs/toolkit';
import log from 'loglevel';

import {
  getChainIdsCaveat,
  getLookupMatchersCaveat,
} from '@metamask/snaps-rpc-methods';
import {
  getAddressBookEntry,
  getNameLookupSnapsIds,
  getPermissionSubjects,
  getSnapMetadata,
} from '../selectors';
import { getCurrentChainId } from '../../shared/modules/selectors/networks';
import { handleSnapRequest } from '../store/actions';
import { NO_RESOLUTION_FOR_DOMAIN } from '../pages/confirmations/send-legacy/send.constants';
import { CHAIN_CHANGED } from '../store/actionConstants';
import { BURN_ADDRESS } from '../../shared/modules/hexstring-utils';
import {
  checkForTyposquatting,
  checkForDomainDropCatching,
} from './domains/typosquatting';
import {
  getResolvedDomainsFromStorage,
  saveResolvedDomainToStorage,
  getPreviouslyResolvedAddress,
} from './domains/storage';

// Local Constants
const ZERO_X_ERROR_ADDRESS = '0x';

const initialState = {
  stage: 'UNINITIALIZED',
  resolutions: null,
  error: null,
  warning: null,
  chainId: null,
  domainName: null,
  typosquattingWarning: null,
  domainDropCatchingWarning: null,
};

export const domainInitialState = initialState;

const name = 'DNS';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    lookupStart: (state, action) => {
      state.domainName = action.payload;
      state.warning = 'loading';
      state.error = null;
      state.typosquattingWarning = null;
      state.domainDropCatchingWarning = null;
    },
    lookupEnd: (state, action) => {
      // first clear out the previous state
      state.resolutions = null;
      state.error = null;
      state.warning = null;
      state.domainName = null;
      state.typosquattingWarning = null;
      state.domainDropCatchingWarning = null;
      const {
        resolutions,
        domainName,
        typosquattingWarning,
        domainDropCatchingWarning,
      } = action.payload;
      const filteredResolutions = resolutions.filter((resolution) => {
        return (
          resolution.resolvedAddress !== BURN_ADDRESS &&
          resolution.resolvedAddress !== ZERO_X_ERROR_ADDRESS
        );
      });
      if (filteredResolutions.length > 0) {
        state.resolutions = filteredResolutions;
        state.typosquattingWarning = typosquattingWarning;
        state.domainDropCatchingWarning = domainDropCatchingWarning;
      } else if (domainName.length > 0) {
        state.error = NO_RESOLUTION_FOR_DOMAIN;
      }
    },
    enableDomainLookup: (state, action) => {
      state.stage = 'INITIALIZED';
      state.error = null;
      state.resolutions = null;
      state.warning = null;
      state.typosquattingWarning = null;
      state.domainDropCatchingWarning = null;
      state.chainId = action.payload;
    },
    resetDomainResolution: (state) => {
      state.resolutions = null;
      state.warning = null;
      state.error = null;
      state.typosquattingWarning = null;
      state.domainDropCatchingWarning = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(CHAIN_CHANGED, (state, action) => {
      if (action.payload !== state.chainId) {
        state.stage = 'UNINITIALIZED';
      }
    });
  },
});

const { reducer, actions } = slice;
export default reducer;

const { lookupStart, lookupEnd, enableDomainLookup, resetDomainResolution } =
  actions;
export { resetDomainResolution };

export function initializeDomainSlice() {
  return (dispatch, getState) => {
    const state = getState();
    const chainId = getCurrentChainId(state);
    dispatch(enableDomainLookup(chainId));
  };
}

export async function fetchResolutions({ domain, chainId, state }) {
  const NAME_LOOKUP_PERMISSION = 'endowment:name-lookup';
  const subjects = getPermissionSubjects(state);
  const nameLookupSnaps = getNameLookupSnapsIds(state);

  const filteredNameLookupSnapsIds = nameLookupSnaps.filter((snapId) => {
    const permission = subjects[snapId]?.permissions[NAME_LOOKUP_PERMISSION];
    const chainIdCaveat = getChainIdsCaveat(permission);
    const lookupMatchersCaveat = getLookupMatchersCaveat(permission);

    if (chainIdCaveat && !chainIdCaveat.includes(chainId)) {
      return false;
    }

    if (lookupMatchersCaveat) {
      const { tlds, schemes } = lookupMatchersCaveat;
      return (
        tlds?.some((tld) => domain.endsWith(`.${tld}`)) ||
        schemes?.some((scheme) => domain.startsWith(`${scheme}:`))
      );
    }

    return true;
  });

  // previous logic would switch request args based on the domain property to determine
  // if this should have been a domain request or a reverse resolution request
  // since reverse resolution is not supported in the send screen flow,
  // the logic was changed to cancel the request, because otherwise a snap can erroneously
  // check for the domain property without checking domain length and return faulty results.
  if (domain.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    filteredNameLookupSnapsIds.map((snapId) => {
      return handleSnapRequest({
        snapId,
        origin: 'metamask',
        handler: 'onNameLookup',
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            domain,
            chainId,
          },
        },
      });
    }),
  );

  const filteredResults = results.reduce(
    (successfulResolutions, result, idx) => {
      if (result.status !== 'rejected' && result.value !== null) {
        const resolutions = result.value.resolvedAddresses.map(
          (resolution) => ({
            ...resolution,
            resolvingSnap: getSnapMetadata(
              state,
              filteredNameLookupSnapsIds[idx],
            )?.name,
            addressBookEntryName: getAddressBookEntry(
              state,
              resolution.resolvedAddress,
            )?.name,
          }),
        );
        return successfulResolutions.concat(resolutions);
      }
      return successfulResolutions;
    },
    [],
  );

  return filteredResults;
}

export function lookupDomainName(domainName, chainId) {
  return async (dispatch, getState) => {
    const trimmedDomainName = domainName.trim();
    let state = getState();
    if (state[name].stage === 'UNINITIALIZED') {
      await dispatch(initializeDomainSlice());
    }
    await dispatch(lookupStart(trimmedDomainName));
    state = getState();
    log.info(`Resolvers attempting to resolve name: ${trimmedDomainName}`);
    const finalChainId = chainId || getCurrentChainId(state);
    const chainIdInt = parseInt(finalChainId, 16);
    const resolutions = await fetchResolutions({
      domain: trimmedDomainName,
      chainId: `eip155:${chainIdInt}`,
      state,
    });

    // Check for typosquatting
    let typosquattingWarning = null;
    try {
      const resolvedDomains = await getResolvedDomainsFromStorage();
      log.info(
        `[Typosquatting] Checking domain: ${trimmedDomainName} against ${Object.keys(resolvedDomains).length} known domains`,
      );
      const typoCheck = checkForTyposquatting(
        trimmedDomainName,
        resolvedDomains,
      );
      if (typoCheck) {
        typosquattingWarning = typoCheck;
        log.warn(
          `[Typosquatting] ALERT TRIGGERED - Potential typosquatting detected for domain: ${trimmedDomainName}`,
          typoCheck,
        );
      } else {
        log.info(
          `[Typosquatting] No similar domains found for: ${trimmedDomainName}`,
        );
      }
    } catch (error) {
      log.error('[Typosquatting] Error during check:', error);
    }

    // Check for domain drop catching attack
    let domainDropCatchingWarning = null;
    if (resolutions && resolutions.length > 0) {
      try {
        const currentAddress = resolutions[0].resolvedAddress;
        const previousAddress = await getPreviouslyResolvedAddress(
          trimmedDomainName,
        );

        log.info(
          `[Domain Drop Catching] Checking domain: ${trimmedDomainName}, currentAddress: ${currentAddress}, previousAddress: ${previousAddress}`,
        );

        if (previousAddress && currentAddress) {
          log.info(
            `[Domain Drop Catching] Calling checkForDomainDropCatching for: ${trimmedDomainName}`,
          );
          const dropCheck = checkForDomainDropCatching(
            trimmedDomainName,
            currentAddress,
            previousAddress,
          );
          if (dropCheck) {
            domainDropCatchingWarning = dropCheck;
            log.warn(
              `[Domain Drop Catching] ALERT TRIGGERED - Domain resolution changed for: ${trimmedDomainName}`,
              dropCheck,
            );
          } else {
            log.info(
              `[Domain Drop Catching] No change detected - addresses match for: ${trimmedDomainName}`,
            );
          }
        } else {
          log.info(
            `[Domain Drop Catching] Skipping check - previousAddress is null for: ${trimmedDomainName}`,
          );
        }
      } catch (error) {
        log.error('[Domain Drop Catching] Error during check:', error);
      }
    }

    // Due to the asynchronous nature of looking up domains, we could reach this point
    // while a new lookup has started, if so we don't use the found result.
    state = getState();
    if (trimmedDomainName !== state[name].domainName) {
      return;
    }

    await dispatch(
      lookupEnd({
        resolutions,
        chainId,
        network: chainIdInt,
        domainName: trimmedDomainName,
        typosquattingWarning,
        domainDropCatchingWarning,
      }),
    );
  };
}

export function getDomainResolutions(state) {
  return state[name].resolutions;
}

export function getDomainError(state) {
  return state[name].error;
}

export function getDomainWarning(state) {
  return state[name].warning;
}

export function getTyposquattingWarning(state) {
  return state[name].typosquattingWarning;
}

export function getDomainDropCatchingWarning(state) {
  return state[name].domainDropCatchingWarning;
}

/**
 * Save a successfully resolved domain to storage
 * Call this after a transaction is confirmed
 */
export function saveDomainResolution(domain, address, chainId) {
  return async () => {
    try {
      await saveResolvedDomainToStorage(domain, address, chainId);
      log.info(`Saved domain resolution to storage: ${domain} -> ${address}`);
    } catch (error) {
      log.error('Error saving domain resolution:', error);
    }
  };
}
