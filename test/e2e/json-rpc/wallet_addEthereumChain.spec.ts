import { strict as assert } from 'assert';
import {
  CaveatConstraint,
  PermissionConstraint,
} from '@metamask/permission-controller';
import FixtureBuilder from '../fixture-builder';
import { Driver } from '../webdriver/driver';
import {
  withFixtures,
  defaultGanacheOptions,
  openDapp,
  unlockWallet,
  WINDOW_TITLES,
} from '../helpers';
import { PermissionNames } from '../../../app/scripts/controllers/permissions';
import { CaveatTypes } from '../../../shared/constants/permissions';

const getPermittedChains = async (driver: Driver) => {
  const getPermissionsRequest = JSON.stringify({
    method: 'wallet_getPermissions',
  });
  const getPermissionsResult = await driver.executeScript(
    `return window.ethereum.request(${getPermissionsRequest})`,
  );

  const permittedChains =
    getPermissionsResult
      ?.find(
        (permission: PermissionConstraint) =>
          permission.parentCapability === PermissionNames.permittedChains,
      )
      ?.caveats.find(
        (caveat: CaveatConstraint) =>
          caveat.type === CaveatTypes.restrictNetworkSwitching,
      )?.value || [];

  return permittedChains;
};

describe('Add Ethereum Chain', function () {
  describe('the dapp is not already permitted to use the chain being added', () => {
    it('automatically permits and switches to the chain when the rpc endpoint is added and no rpc endpoint previously existed for the chain', async function () {
      await withFixtures(
        {
          dapp: true,
          fixtures: new FixtureBuilder().build(),
          ganacheOptions: {
            ...defaultGanacheOptions,
            concurrent: [{ port: 8546, chainId: 1338 }],
          },
          title: this.test?.fullTitle(),
        },
        async ({ driver }: { driver: Driver }) => {
          await unlockWallet(driver);
          await openDapp(driver);

          const beforePermittedChains = await getPermittedChains(driver);

          assert.deepEqual(beforePermittedChains, []);

          const switchEthereumChainRequest = JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x53a',
                chainName: 'Localhost 1338',
                nativeCurrency: {
                  name: '',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['http://localhost:8546'],
                blockExplorerUrls: [],
              },
            ],
          });

          await driver.executeScript(
            `window.ethereum.request(${switchEthereumChainRequest})`,
          );

          await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
          await driver.clickElement({ text: 'Approve', tag: 'button' });

          await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

          const afterPermittedChains = await getPermittedChains(driver);
          assert.deepEqual(afterPermittedChains, ['0x53a']);
        },
      );
    });

    it('automatically permits and switches to the chain when the rpc endpoint is added but a different rpc endpoint already existed for the chain', async function () {
      await withFixtures(
        {
          dapp: true,
          fixtures: new FixtureBuilder()
            .withNetworkControllerDoubleGanache()
            .build(),
          ganacheOptions: {
            ...defaultGanacheOptions,
            concurrent: [{ port: 8546, chainId: 1338 }],
          },
          title: this.test?.fullTitle(),
        },
        async ({ driver }: { driver: Driver }) => {
          await unlockWallet(driver);
          await openDapp(driver);

          const beforePermittedChains = await getPermittedChains(driver);

          assert.deepEqual(beforePermittedChains, []);

          const switchEthereumChainRequest = JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x53a',
                chainName: 'Localhost 8546 alternative',
                nativeCurrency: {
                  name: '',
                  symbol: 'ETH',
                  decimals: 18,
                },
                // this does not match what already exists in the NetworkController
                rpcUrls: ['http://127.0.0.1:8546'],
                blockExplorerUrls: [],
              },
            ],
          });

          await driver.executeScript(
            `window.ethereum.request(${switchEthereumChainRequest})`,
          );

          await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
          await driver.clickElement({ text: 'Approve', tag: 'button' });

          await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

          const afterPermittedChains = await getPermittedChains(driver);
          assert.deepEqual(afterPermittedChains, ['0x53a']);
        },
      );
    });

    it('prompts to switch to the chain when the rpc endpoint being added already exists', async function () {
      await withFixtures(
        {
          dapp: true,
          fixtures: new FixtureBuilder()
            .withNetworkControllerDoubleGanache()
            .build(),
          ganacheOptions: {
            ...defaultGanacheOptions,
            concurrent: [{ port: 8546, chainId: 1338 }],
          },
          title: this.test?.fullTitle(),
        },
        async ({ driver }: { driver: Driver }) => {
          await unlockWallet(driver);
          await openDapp(driver);

          const beforePermittedChains = await getPermittedChains(driver);

          assert.deepEqual(beforePermittedChains, []);

          const addEthereumChainRequest = JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x53a',
                chainName: 'Localhost 8546',
                nativeCurrency: {
                  name: '',
                  symbol: 'ETH',
                  decimals: 18,
                },
                // this matches what already exists in the NetworkController
                rpcUrls: ['http://localhost:8546'],
                blockExplorerUrls: [],
              },
            ],
          });

          await driver.executeScript(
            `window.ethereum.request(${addEthereumChainRequest})`,
          );

          await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
          await driver.findElement({ text: 'Use your enabled networks' });
          await driver.findElement({ text: 'Localhost 8546' });
          await driver.clickElement({ text: 'Confirm', tag: 'button' });

          await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

          const afterPermittedChains = await getPermittedChains(driver);
          assert.deepEqual(afterPermittedChains, ['0x53a']);
        },
      );
    });
  });

  describe('the dapp is already permitted to use the chain being added', () => {
    it('automatically switches to the chain when the rpc endpoint is added but a different rpc endpoint already existed for the chain', async function () {
      await withFixtures(
        {
          dapp: true,
          fixtures: new FixtureBuilder()
            .withNetworkControllerDoubleGanache()
            .withPermissionControllerConnectedToTestDappWithChains([
              '0x539',
              '0x53a',
            ])
            .build(),
          ganacheOptions: {
            ...defaultGanacheOptions,
            concurrent: [{ port: 8546, chainId: 1338 }],
          },
          title: this.test?.fullTitle(),
        },
        async ({ driver }: { driver: Driver }) => {
          await unlockWallet(driver);
          await openDapp(driver);

          const beforePermittedChains = await getPermittedChains(driver);
          assert.deepEqual(beforePermittedChains, ['0x539', '0x53a']);

          // should start on 1337
          await driver.findElement({ css: '#chainId', text: '0x539' });

          const switchEthereumChainRequest = JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x53a',
                chainName: 'Localhost 8546 alternative',
                nativeCurrency: {
                  name: '',
                  symbol: 'ETH',
                  decimals: 18,
                },
                // this does not match what already exists in the NetworkController
                rpcUrls: ['http://127.0.0.1:8546'],
                blockExplorerUrls: [],
              },
            ],
          });

          await driver.executeScript(
            `window.ethereum.request(${switchEthereumChainRequest})`,
          );

          await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
          await driver.clickElement({ text: 'Approve', tag: 'button' });

          await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

          const afterPermittedChains = await getPermittedChains(driver);
          assert.deepEqual(afterPermittedChains, ['0x539', '0x53a']);

          // should end on 1338
          await driver.findElement({ css: '#chainId', text: '0x53a' });
        },
      );
    });

    it('automatically switches to the chain when the rpc endpoint being added already exists for the chain', async function () {
      await withFixtures(
        {
          dapp: true,
          fixtures: new FixtureBuilder()
            .withNetworkControllerDoubleGanache()
            .withPermissionControllerConnectedToTestDappWithChains([
              '0x539',
              '0x53a',
            ])
            .build(),
          ganacheOptions: {
            ...defaultGanacheOptions,
            concurrent: [{ port: 8546, chainId: 1338 }],
          },
          title: this.test?.fullTitle(),
        },
        async ({ driver }: { driver: Driver }) => {
          await unlockWallet(driver);
          await openDapp(driver);

          const beforePermittedChains = await getPermittedChains(driver);
          assert.deepEqual(beforePermittedChains, ['0x539', '0x53a']);

          // should start on 1337
          await driver.findElement({ css: '#chainId', text: '0x539' });

          const switchEthereumChainRequest = JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x53a',
                chainName: 'Localhost 8546',
                nativeCurrency: {
                  name: '',
                  symbol: 'ETH',
                  decimals: 18,
                },
                // this matches what already exists in the NetworkController
                rpcUrls: ['http://localhost:8546'],
                blockExplorerUrls: [],
              },
            ],
          });

          await driver.executeScript(
            `window.ethereum.request(${switchEthereumChainRequest})`,
          );

          const afterPermittedChains = await getPermittedChains(driver);
          assert.deepEqual(afterPermittedChains, ['0x539', '0x53a']);

          // should end on 1338
          await driver.findElement({ css: '#chainId', text: '0x53a' });
        },
      );
    });
  });
});
