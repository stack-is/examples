import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { Linking } from 'react-native';
import {
    NavigationContainer,
    NavigationProp,
    RouteProp,
    useNavigation,
    useRoute
} from '@react-navigation/native';
import { Card, Currency, Invoice } from './Boilerplate';
import { differenceInMilliseconds } from 'date-fns';
import { getRandomId, GlobalStorage, sleep } from '../common/Utilities';
import { NativeStackNavigationProp } from '@react-navigation/native-stack/lib/typescript/src/types';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack/src/types';
import { NavigationState } from '@react-navigation/routers';

export enum Screens {
    InvoiceList = 'InvoiceList',
    InvoiceDetail = 'InvoiceDetail',
    EditName = 'EditName',
    Authentication = 'Authentication',
    SelectCard = 'SelectCard',
    SelectCurrency = 'SelectCurrency',
    SelectDate = 'SelectDate'
}

export const MODALS: Screens[] = [
    Screens.Authentication,
    Screens.SelectCard,
    Screens.SelectCurrency,
    Screens.SelectDate
];
export const MODAL_ANIMATION_DURATION = 350;
export type ScreenDefinitions =
    | {
          screen: Screens.InvoiceDetail;
          input: Invoice;
          output: Invoice;
      }
    | {
          screen: Screens.Authentication;
          input: undefined;
          output: { successful: boolean };
      }
    | {
          screen: Screens.SelectCard;
          input: undefined;
          output: Card;
      }
    | {
          screen: Screens.SelectCurrency;
          input: undefined;
          output: Currency;
      }
    | {
          screen: Screens.SelectDate;
          input: { defaultSelection?: number; maxDate?: number; minDate?: number };
          output: number;
      };

type ScreenDefinition<T extends Screens> = Extract<
    ScreenDefinitions,
    {
        screen: T;
    }
>;

export type CommonScreenInput = { screen?: Screens; initial?: boolean } | undefined;
export type ScreenInput<T extends Screens> = ScreenDefinition<T> extends never
    ? undefined
    : ScreenDefinition<T> extends { input: infer TOut }
    ? TOut
    : undefined;

export type ScreenOutput<T extends Screens> = ScreenDefinition<T> extends never
    ? undefined
    : ScreenDefinition<T> extends { output: infer TOut }
    ? TOut
    : undefined;

export type ScreenResult<T extends Screens> =
    | {
          backClicked: true;
          result: undefined;
      }
    | { backClicked: false; result: ScreenOutput<T> };

export type FullParams<T extends Screens> = ScreenInput<T> & {
    listenerId?: string;
};

enum NavigationType {
    Push = 'Push',
    Navigate = 'Navigate',
    Replace = 'Replace'
}

export class Navigator<TCurrentScreen extends Screens> {
    private lastNavigation = new Date(0);
    private isGoingBack = false;

    private get navigationAllowed(): boolean {
        return differenceInMilliseconds(new Date(), this.lastNavigation) >= 500;
    }

    constructor(
        private screen: Screens,
        private navigation: NavigationProp<any, any>,
        private route: RouteProp<any, any>,
        private navigationListeners: NavigationListenerStorage
    ) {
        navigation.addListener('beforeRemove', () => {
            if (this.isGoingBack) {
                //Not triggering swipe detector due to already going back
                return;
            }
            //This is most likely due to the user swiping back on iOS, we need to call goBack in that case
            this.goBack();
        });
    }

    canGoBack(): boolean {
        return this.navigation.canGoBack();
    }

    async navigate<TNewScreen extends Screens>(
        ...args: ScreenInput<TNewScreen> extends undefined
            ? [screen: TNewScreen] | [screen: TNewScreen, input: CommonScreenInput]
            : [screen: TNewScreen, input: ScreenInput<TNewScreen> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen>> {
        return this.internalNavigate(NavigationType.Navigate, ...args);
    }

    async replace<TNewScreen extends Screens>(
        ...args: ScreenInput<TNewScreen> extends undefined
            ? [screen: TNewScreen] | [screen: TNewScreen, input: CommonScreenInput]
            : [screen: TNewScreen, input: ScreenInput<TNewScreen> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen>> {
        return this.internalNavigate(NavigationType.Replace, ...args);
    }

    async push<TNewScreen extends Screens>(
        ...args: ScreenInput<TNewScreen> extends undefined
            ? [screen: TNewScreen] | [screen: TNewScreen, input: CommonScreenInput]
            : [screen: TNewScreen, input: ScreenInput<TNewScreen> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen>> {
        return this.internalNavigate(NavigationType.Push, ...args);
    }

    private async internalNavigate<TNewScreen extends Screens>(
        type: NavigationType,
        ...args: ScreenInput<TNewScreen> extends undefined
            ? [screen: TNewScreen] | [screen: TNewScreen, input: CommonScreenInput]
            : [screen: TNewScreen, input: ScreenInput<TNewScreen> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen>> {
        if (this.navigationAllowed) {
            this.lastNavigation = new Date();
            return new Promise<ScreenResult<TNewScreen>>(resolve => {
                const screen = args[0];
                const input = args.length > 1 ? args[1] : {};
                const listenerId = getRandomId();
                this.navigationListeners[listenerId] = (result: any) => {
                    resolve(result);
                };
                const payload: FullParams<any> = {
                    ...input,
                    listenerId
                } as any;
                switch (type) {
                    case NavigationType.Push:
                        (this.navigation as any).push(screen, payload);
                        break;
                    case NavigationType.Navigate:
                        (this.navigation as any).navigate(screen, payload);
                        break;
                    case NavigationType.Replace:
                        (this.navigation as any).replace(screen, payload);
                        break;
                    default:
                        throw new Error(`Unknown navigation type`);
                }
            });
        }
        //In this case we simulate a back click and unchanged status. Could add a "cancelled" field later on
        return {
            backClicked: true,
            result: undefined
        };
    }

    private notifyListenerIfPresent(result: ScreenResult<TCurrentScreen>) {
        const params = this.route.params as unknown as FullParams<TCurrentScreen>;

        if (!!params?.listenerId) {
            const listener: NavigationListener<ScreenResult<TCurrentScreen>> =
                this.navigationListeners[params.listenerId];
            if (listener) {
                listener(result);
                delete this.navigationListeners[params.listenerId];
            }
        }
    }

    private async internalGoBack(result: ScreenResult<TCurrentScreen>) {
        if (this.isGoingBack) {
            return;
        }
        this.isGoingBack = true;
        this.navigation.goBack();
        if (MODALS.includes(this.screen)) {
            await sleep(MODAL_ANIMATION_DURATION);
        }
        this.notifyListenerIfPresent(result);
        this.isGoingBack = false;
    }
    async completeAndGoBack(result: ScreenOutput<TCurrentScreen>) {
        return this.internalGoBack({
            backClicked: false,
            result
        });
    }

    async goBack() {
        return this.internalGoBack({
            backClicked: true,
            result: undefined
        });
    }
}

export function useAsyncNavigation<TScreen extends Screens = Screens>(
    screen: TScreen,
    options?: NativeStackNavigationOptions
): {
    params: ScreenInput<TScreen>;
    navigator: Navigator<TScreen>;
    navigation: NativeStackNavigationProp<any, any>;
} {
    const navigation = useNavigation() as NativeStackNavigationProp<any, any>;
    const route = useRoute();
    const { navigationListeners } = useContext(AsyncNavigationContext);
    const navigator = useMemo(
        () => new Navigator<TScreen>(screen, navigation, route, navigationListeners),
        []
    );
    useLayoutEffect(() => {
        if (options) {
            navigation.setOptions(options);
        }
    }, [navigation]);

    return {
        navigator,
        navigation,
        params: route.params as ScreenInput<TScreen>
    };
}

export type NavigationListener<T = any> = (result: T) => void;
export type NavigationListenerStorage = Record<string, NavigationListener>;
export const AsyncNavigationContext = createContext<{
    navigationListeners: NavigationListenerStorage;
}>({ navigationListeners: {} });
const NAVIGATION_PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';
export const AsyncNavigationContainer: React.FC<PropsWithChildren> = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [initialState, setInitialState] = useState();
    const navigationListeners = useRef<NavigationListenerStorage>({});
    useEffect(() => {
        const restoreState = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();

                if (initialUrl == null) {
                    // Only restore state if there's no deep link
                    const savedStateString = GlobalStorage.getString(NAVIGATION_PERSISTENCE_KEY);
                    const state = savedStateString ? JSON.parse(savedStateString) : undefined;

                    if (state !== undefined) {
                        setInitialState(state);
                    }
                }
            } finally {
                setIsReady(true);
            }
        };

        if (!isReady) {
            restoreState();
        }
    }, [isReady]);

    const onStateChange = useCallback((state: NavigationState | undefined) => {
        //Here you could apply logic to skip saving the state if the current screen is a general screen
        GlobalStorage.set(NAVIGATION_PERSISTENCE_KEY, JSON.stringify(state));
    }, []);
    if (!isReady) {
        return null;
    }
    return (
        <AsyncNavigationContext.Provider
            value={{ navigationListeners: navigationListeners.current }}>
            <NavigationContainer initialState={initialState} onStateChange={onStateChange}>
                {children}
            </NavigationContainer>
        </AsyncNavigationContext.Provider>
    );
};
