import { StoreEnhancer } from 'redux';
import { configureStore as baseConfigureStore } from '@reduxjs/toolkit';
import devtoolsEnhancer from 'remote-redux-devtools';
import rootReducer from '../ducks';

/**
 * This interface is temporary and is copied from the message-manager.js file
 * and is the 'msgParams' key of the interface declared there. We should get a
 * universal Message type to use for this, the Message manager and all
 * the other types of messages.
 *
 * TODO: Replace this
 */
export type TemporaryMessageDataType = {
  id: string;
  type: string;
  msgParams: {
    metamaskId: string;
    data: string;
  };
  ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
  metadata?: {
    custodyId?: string;
  };
  status?: string;
  ///: END:ONLY_INCLUDE_IF
};

export type MessagesIndexedById = {
  [id: string]: TemporaryMessageDataType;
};

type RootReducerReturnType = ReturnType<typeof rootReducer>;

export type CombinedBackgroundAndReduxState = RootReducerReturnType & {
  activeTab: {
    origin: string;
  };
  metamask: RootReducerReturnType['metamask'];
  appState: RootReducerReturnType['appState'];
  send: RootReducerReturnType['send'];
  DNS: RootReducerReturnType['DNS'];
  history: RootReducerReturnType['history'];
  confirmAlerts: RootReducerReturnType['confirmAlerts'];
  confirmTransaction: RootReducerReturnType['confirmTransaction'];
  swaps: RootReducerReturnType['swaps'];
  bridge: RootReducerReturnType['bridge'];
  gas: RootReducerReturnType['gas'];
  localeMessages: RootReducerReturnType['localeMessages'];
};

// TODO: Replace `any` with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function configureStore(preloadedState: any) {
  const debugModeEnabled = Boolean(process.env.METAMASK_DEBUG);
  const isDev = debugModeEnabled && !process.env.IN_TEST;
  const enhancers: StoreEnhancer[] = [];

  if (isDev) {
    enhancers.push(
      devtoolsEnhancer({
        name: 'MetaMask',
        hostname: 'localhost',
        port: 8000,
        realtime: true,
      }) as StoreEnhancer,
    );
  }

  return baseConfigureStore({
    reducer: rootReducer as () => CombinedBackgroundAndReduxState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        /**
         * We do not persist the redux tree for rehydration, so checking for
         * serializable state keys is not relevant for now. Any state that persists
         * is managed in the background. We may at some point want this, but we can
         * gradually implement by using the ignore options to ignore those actions
         * and state keys that are not serializable, preventing us from adding new
         * actions and state that would violate our ability to persist state keys.
         * NOTE: redux-thunk is included by default in the middleware below.
         */
        serializableCheck: false,
        /**
         * immutableCheck controls whether we get warnings about mutation of
         * state, this is turned off by default for now since it heavily affects
         * performance due to the Redux state growing larger.
         */
        immutableCheck: false,
      }),
    devTools: false,
    enhancers,
    preloadedState,
  });
}
type Store = ReturnType<typeof configureStore>;
export type MetaMaskReduxState = ReturnType<Store['getState']>;
export type MetaMaskReduxDispatch = Store['dispatch'];
