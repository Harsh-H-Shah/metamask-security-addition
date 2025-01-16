import { Reducer, StoreEnhancer } from 'redux';
import { configureStore as baseConfigureStore } from '@reduxjs/toolkit';
import devtoolsEnhancer from 'remote-redux-devtools';
import rootReducer from '../ducks';
import { AppSliceState } from '../ducks/app/app';
import { BackgroundSliceState } from '../ducks/background/background';
import { BackgroundStateProxy } from '../../shared/types/background';

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

type _$toIntersection2<T> = (
  T extends unknown ? (x: T) => unknown : never
) extends (x: infer X) => void
  ? X
  : never;

type _$toIntersection<T> = boolean extends T
  ? boolean & _$toIntersection2<Exclude<T, boolean>>
  : _$toIntersection2<T>;

type _$toList<T, O extends unknown[] = []> = _$toIntersection<
  T extends unknown ? (t: T) => T : never
> extends (x: never) => infer X
  ? _$toList<Exclude<T, X>, [X, ...O]>
  : O;

export type _$cast<T, U> = [T] extends [U] ? T : U;

export type _$keys<T extends Record<string, unknown>> = _$toList<keyof T>;

type _PrependKeyToEntries<K extends PropertyKey, E extends unknown[][]> = {
  [I in keyof E]: E[I] extends unknown[] ? [K, ...E[I]] : never;
};

type _DeepEntriesKey<
  O extends Record<PropertyKey, unknown>,
  K extends PropertyKey,
> = O[K] extends Record<PropertyKey, unknown>
  ? _PrependKeyToEntries<K, _$deepEntries<O[K]>>
  : [[K, O[K]]];

export type _$deepEntries<
  O extends Record<PropertyKey, unknown>,
  Keys extends unknown[] = _$keys<O>,
  Acc extends unknown[][] = [],
  DEEP_KEYS = _DeepEntriesKey<O, _$cast<Keys[0], PropertyKey>>,
> = Keys extends [infer K, ...infer Rest]
  ? K extends keyof O
    ? _$deepEntries<O, Rest, [...Acc, ..._$cast<DEEP_KEYS, unknown[][]>]>
    : never
  : Acc;

type _$display<T extends Record<PropertyKey, unknown>> = {
  [key in keyof T]: T[key];
};

export type _ = _DeepEntriesKey<
  _$display<BackgroundStateProxy>,
  keyof _$display<BackgroundStateProxy>
>;

type FlattenedBackgroundStateProxy =
  FlattenObjectOneLevel<BackgroundStateProxy>;

/**
 * `ReduxState` overrides incorrectly typed properties of `RootReducerReturnType`, and is only intended to be used as an input for `configureStore`.
 * The `MetaMaskReduxState` type (derived from the returned output of `configureStore`) is to be used consistently as the single source-of-truth and representation of Redux state shape.
 *
 * Redux slice reducers that are passed an `AnyAction`-type `action` parameter are inferred to have a return type of `never`.
 * TODO: Supply exhaustive action types to all Redux slices (specifically `metamask` and `appState`)
 */
type ReduxState = {
  activeTab: {
    origin: string;
  };
  metamask: FlattenedBackgroundStateProxy;
  background: BackgroundSliceState['background'];
  appState: AppSliceState['appState'];
} & Omit<RootReducerReturnType, 'activeTab' | 'metamask' | 'appState'>;

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
    reducer: rootReducer as unknown as Reducer<ReduxState>,
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
