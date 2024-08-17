import React from 'react';
import configureMockStore from 'redux-mock-store';
import { renderWithProvider } from '../../../../../test/jest/rendering';
import { defaultNetworksData } from '../networks-tab.constants';
import { CHAIN_IDS } from '../../../../../shared/constants/network';
import { mockNetworkState } from '../../../../../test/jest/mocks';
import NetworksList from '.';

const mockState = {
  metamask: {
    ...mockNetworkState(CHAIN_IDS.MAINNET),
  },
};

const renderComponent = (props) => {
  const store = configureMockStore([])(mockState);
  return renderWithProvider(<NetworksList {...props} />, store);
};

const defaultNetworks = defaultNetworksData.map((network) => ({
  ...network,
  viewOnly: true,
  isATestNetwork: true,
}));

const props = {
  networkDefaultedToProvider: false,
  networkIsSelected: false,
  networksToRender: defaultNetworks,
  selectedRpcUrl: 'http://localhost:8545',
  isATestNetwork: true,
};

describe('NetworksList Component', () => {
  it('should render a list of networks correctly', () => {
    const { queryByText } = renderComponent(props);

    expect(queryByText('Ethereum Mainnet')).toBeInTheDocument();
    expect(queryByText('Sepolia test network')).toBeInTheDocument();
  });
});
