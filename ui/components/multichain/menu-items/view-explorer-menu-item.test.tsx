import React from 'react';
import { BtcAccountType } from '@metamask/keyring-api';
import { fireEvent, renderWithProvider } from '../../../../test/jest';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { createMockInternalAccount } from '../../../../test/jest/mocks';
import {
  MULTICHAIN_NETWORK_TO_EXPLORER_URL,
  MultichainNetworks,
} from '../../../../shared/constants/multichain/networks';
import { ViewExplorerMenuItem } from '.';

const mockAccount = createMockInternalAccount({
  name: 'Account 1',
  address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
});

const mockNonEvmAccount = createMockInternalAccount({
  address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  // @ts-expect-error no type in createMockInternalAccount
  type: BtcAccountType.P2wpkh,
});

const render = (account = mockAccount) => {
  const defaultState = {
    ...mockState,
    metamask: {
      ...mockState.metamask,
      completedOnboarding: true,
    },
  };
  const store = configureStore(defaultState);
  return renderWithProvider(
    <ViewExplorerMenuItem
      metricsLocation="Global Menu"
      closeMenu={jest.fn()}
      account={account}
    />,
    store,
  );
};

describe('ViewExplorerMenuItem', () => {
  it('renders "View on explorer"', () => {
    global.platform = { openTab: jest.fn(), closeCurrentWindow: jest.fn() };

    const { getByText, getByTestId } = render();
    expect(getByText('View on explorer')).toBeInTheDocument();

    const openExplorerTabSpy = jest.spyOn(global.platform, 'openTab');
    fireEvent.click(getByTestId('account-list-menu-open-explorer'));
    expect(openExplorerTabSpy).toHaveBeenCalled();
  });

  it('renders "View on explorer" for non-EVM account', () => {
    const expectedExplorerUrl = `${
      MULTICHAIN_NETWORK_TO_EXPLORER_URL[MultichainNetworks.BITCOIN]
    }/${mockNonEvmAccount.address}`;
    const expectedExplorerUrlOriginWithoutProtocol = new URL(
      expectedExplorerUrl,
    ).origin.replace(/^https?:\/\//u, '');
    global.platform = { openTab: jest.fn(), closeCurrentWindow: jest.fn() };

    const { getByText, getByTestId } = render(mockNonEvmAccount);
    expect(getByText('View on explorer')).toBeInTheDocument();
    expect(
      getByText(expectedExplorerUrlOriginWithoutProtocol),
    ).toBeInTheDocument();

    const openExplorerTabSpy = jest.spyOn(global.platform, 'openTab');
    fireEvent.click(getByTestId('account-list-menu-open-explorer'));
    expect(openExplorerTabSpy).toHaveBeenCalledWith({
      url: expectedExplorerUrl,
    });
  });
});
