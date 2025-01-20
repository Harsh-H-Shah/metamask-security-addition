import browser from 'webextension-polyfill';
import Migrator from '../migrator';
import { ExtensionStore } from './ExtensionStore';
import { IntermediaryStateType } from './BaseStore';

const DEFAULT_INITIAL_STATE = {
  data: { config: {} },
  meta: { version: 0 },
};

jest.mock('webextension-polyfill', () => ({
  runtime: { lastError: null },
  storage: { local: true },
}));

const setup = (options: { localMock?: { get?: unknown } | false } = {}) => {
  if (typeof options.localMock === 'undefined') {
    browser.storage.local =
      jest.fn() as unknown as browser.Storage.LocalStorageArea;
  } else if (options.localMock === false) {
    browser.storage.local =
      undefined as unknown as browser.Storage.LocalStorageArea;
  } else {
    browser.storage.local =
      options.localMock as unknown as browser.Storage.LocalStorageArea;
  }
  const migrator = new Migrator();
  return new ExtensionStore({ migrator });
};
describe('ExtensionStore', () => {
  beforeEach(() => {
    global.sentry = {
      captureException: jest.fn(),
    };
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    browser.storage.local =
      undefined as unknown as browser.Storage.LocalStorageArea;
  });
  describe('constructor', () => {
    it('should set isSupported property to false when browser does not support local storage', () => {
      const localStore = setup({ localMock: false });

      expect(localStore.isSupported).toBe(false);
    });

    it('should set isSupported property to true when browser supports local storage', () => {
      const localStore = setup();
      expect(localStore.isSupported).toBe(true);
    });

    it('should initialize mostRecentRetrievedState to null', () => {
      const localStore = setup({ localMock: false });
      expect(localStore.mostRecentRetrievedState).toBeNull();
    });

    it('should initialize isExtensionInitialized to false', () => {
      const localStore = setup({ localMock: false });
      expect(localStore.isExtensionInitialized).toBeFalsy();
    });
  });

  describe('setMetadata', () => {
    it('should set the metadata property on LocalStore', () => {
      const metadata = { version: 74 };
      const localStore = setup();
      localStore.metadata = metadata;

      expect(localStore.metadata).toStrictEqual(metadata);
    });
  });

  describe('set', () => {
    it('should throw an error if called in a browser that does not support local storage', async () => {
      const localStore = setup({ localMock: false });
      await expect(() => localStore.set({})).rejects.toThrow(
        'Metamask- cannot persist state to local store as this browser does not support this action',
      );
    });

    it('should throw an error if not passed a state parameter', async () => {
      const localStore = setup();
      await expect(() =>
        localStore.set(undefined as unknown as IntermediaryStateType),
      ).rejects.toThrow('MetaMask - updated state is missing');
    });

    it('should throw an error if passed a valid argument but metadata has not yet been set', async () => {
      const localStore = setup();
      await expect(() =>
        localStore.set({ appState: { test: true } }),
      ).rejects.toThrow(
        'MetaMask - metadata must be set on instance of ExtensionStore before calling "set"',
      );
    });

    it('should not throw if passed a valid argument and metadata has been set', async () => {
      const localStore = setup();
      localStore.metadata = { version: 74 };
      await expect(async function () {
        localStore.set({ appState: { test: true } });
      }).not.toThrow();
    });

    it('should set isExtensionInitialized if data is set with no error', async () => {
      const localStore = setup();
      localStore.metadata = { version: 74 };
      await localStore.set({ appState: { test: true } });
      expect(localStore.isExtensionInitialized).toBeTruthy();
    });
  });

  describe('get', () => {
    it('should return default state tree if called in a browser that does not support local storage', async () => {
      const localStore = setup({ localMock: false });
      const result = await localStore.get();
      expect(result).toStrictEqual(DEFAULT_INITIAL_STATE);
    });

    it('should update mostRecentRetrievedState', async () => {
      const localStore = setup({
        localMock: {
          get: jest
            .fn()
            .mockImplementation(() =>
              Promise.resolve({ data: { test: true } }),
            ),
        } as unknown as browser.Storage.LocalStorageArea,
      });

      await localStore.get();

      expect(localStore.mostRecentRetrievedState).toStrictEqual({
        data: { test: true },
      });
    });

    it('should return default state, reset mostRecentRetrievedState to null, and set stateCorruptionDetected to true, if storage.local is an empty object', async () => {
      const localStore = setup({
        localMock: {
          get: jest.fn().mockImplementation(() => Promise.resolve({})),
        } as unknown as browser.Storage.LocalStorageArea,
      });

      const result = await localStore.get();

      expect(result).toStrictEqual(DEFAULT_INITIAL_STATE);

      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
      expect(localStore.stateCorruptionDetected).toStrictEqual(true);
    });

    it('should return default state, reset mostRecentRetrievedState to null, and set stateCorruptionDetected to true, if storage.local returns undefined', async () => {
      const localStore = setup({
        localMock: {
          get: jest.fn().mockImplementation(() => Promise.resolve()),
        } as unknown as browser.Storage.LocalStorageArea,
      });

      const result = await localStore.get();

      expect(result).toStrictEqual(DEFAULT_INITIAL_STATE);

      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
      expect(localStore.stateCorruptionDetected).toStrictEqual(true);
    });

    it('should return default state, reset mostRecentRetrievedState to null, and set stateCorruptionDetected to true, if storage.local returns an object without a data property', async () => {
      const localStore = setup({
        localMock: {
          get: jest
            .fn()
            .mockImplementation(() => Promise.resolve({ foo: 'bar' })),
        } as unknown as browser.Storage.LocalStorageArea,
      });

      const result = await localStore.get();

      expect(result).toStrictEqual(DEFAULT_INITIAL_STATE);

      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
      expect(localStore.stateCorruptionDetected).toStrictEqual(true);
    });

    it('should return default state, reset mostRecentRetrievedState to null, and set stateCorruptionDetected to true, if storage.local returns an object with an undefined data property', async () => {
      const localStore = setup({
        localMock: {
          get: jest
            .fn()
            .mockImplementation(() => Promise.resolve({ data: undefined })),
        } as unknown as browser.Storage.LocalStorageArea,
      });

      const result = await localStore.get();

      expect(result).toStrictEqual(DEFAULT_INITIAL_STATE);

      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
      expect(localStore.stateCorruptionDetected).toStrictEqual(true);
    });

    it('should set mostRecentRetrievedState to current state if isExtensionInitialized is true', async () => {
      const localStore = setup({
        localMock: {
          get: jest.fn().mockImplementation(() => Promise.resolve({})),
        },
      });
      localStore.metadata = { version: 74 };
      await localStore.set({ appState: { test: true } });
      await localStore.get();
      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
    });
  });

  describe('cleanUpMostRecentRetrievedState', () => {
    it('should set mostRecentRetrievedState to null if it is defined', async () => {
      const localStore = setup({
        localMock: {
          get: jest
            .fn()
            .mockImplementation(() =>
              Promise.resolve({ appState: { test: true } }),
            ),
        },
      });
      await localStore.get();

      // mostRecentRetrievedState should be { appState: { test: true } } at this stage
      await localStore.cleanUpMostRecentRetrievedState();
      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
    });

    it('should not set mostRecentRetrievedState if it is null', async () => {
      const localStore = setup();

      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
      await localStore.cleanUpMostRecentRetrievedState();
      expect(localStore.mostRecentRetrievedState).toStrictEqual(null);
    });
  });
});
