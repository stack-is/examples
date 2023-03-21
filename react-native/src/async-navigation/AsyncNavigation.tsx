import React, {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
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
import { Invoice } from './Boilerplate';
import { differenceInMilliseconds } from 'date-fns';
import { getRandomId, GlobalStorage } from '../common/Utilities';

export enum Screens {
    InvoiceList = 'InvoiceList',
    InvoiceDetail = 'InvoiceDetail',
    EditName = 'EditName',
    Authentication = 'Authentication',
    SelectCard = 'SelectCard',
    SelectCurrency = 'SelectCurrency',
    SelectDate = 'SelectDate'
}

export type ScreenDefinitions = {
    screen: Screens.InvoiceDetail;
    input: Invoice;
    output: Invoice;
};
export type CommonScreenInput = { screen?: Screens; initial?: boolean } | undefined;
export type ScreenInput<
    T extends Screens,
    A,
    TExtracted = Extract<
        A,
        {
            screen: T;
        }
    >
> = TExtracted extends never
    ? undefined
    : TExtracted extends { input: infer TOut }
    ? TOut
    : undefined;

export type ScreenOutput<
    T extends Screens,
    A,
    TExtracted = Extract<
        A,
        {
            screen: T;
        }
    >
> = TExtracted extends never
    ? undefined
    : TExtracted extends { output: infer TOut }
    ? TOut
    : undefined;
export type ScreenResult<T extends Screens, A> = {
    backClicked?: boolean;
    result?: ScreenOutput<T, A>;
};

export type FullParams<T extends Screens, A> = {
    listenerId?: string;
    [key: string]: any;
};

enum NavigationType {
    Push = 'Push',
    Navigate = 'Navigate',
    Replace = 'Replace'
}

export class Navigator<TCurrentScreen extends Screens> {
    private lastNavigation = new Date(0);
    private hasGoneBack = false;
    private isGoingBack = false;

    onGoBackListener?: () => void;

    private get navigationAllowed(): boolean {
        return differenceInMilliseconds(new Date(), this.lastNavigation) >= 500;
    }

    constructor(
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
        ...args: ScreenInput<TNewScreen, ScreenDefinitions> extends undefined
            ? [TNewScreen] | [TNewScreen, CommonScreenInput]
            : [TNewScreen, ScreenInput<TNewScreen, ScreenDefinitions> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen, ScreenDefinitions>> {
        return this.internalNavigate(NavigationType.Navigate, ...args);
    }

    async replace<TNewScreen extends Screens>(
        ...args: ScreenInput<TNewScreen, ScreenDefinitions> extends undefined
            ? [TNewScreen] | [TNewScreen, CommonScreenInput]
            : [TNewScreen, ScreenInput<TNewScreen, ScreenDefinitions> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen, ScreenDefinitions>> {
        return this.internalNavigate(NavigationType.Replace, ...args);
    }

    async push<TNewScreen extends Screens>(
        ...args: ScreenInput<TNewScreen, ScreenDefinitions> extends undefined
            ? [TNewScreen] | [TNewScreen, CommonScreenInput]
            : [TNewScreen, ScreenInput<TNewScreen, ScreenDefinitions> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen, ScreenDefinitions>> {
        return this.internalNavigate(NavigationType.Push, ...args);
    }

    private async internalNavigate<TNewScreen extends Screens>(
        type: NavigationType,
        ...args: ScreenInput<TNewScreen, ScreenDefinitions> extends undefined
            ? [TNewScreen] | [TNewScreen, CommonScreenInput]
            : [TNewScreen, ScreenInput<TNewScreen, ScreenDefinitions> & CommonScreenInput]
    ): Promise<ScreenResult<TNewScreen, ScreenDefinitions>> {
        if (this.navigationAllowed) {
            this.lastNavigation = new Date();
            return new Promise<ScreenResult<TNewScreen, ScreenDefinitions>>(resolve => {
                const screen = args[0] as TNewScreen;
                const input = args.length > 1 ? args[1] : {};
                const listenerId = getRandomId();
                this.navigationListeners[listenerId] = (result: any) => {
                    resolve(result);
                };
                const payload: FullParams<any, any> = {
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
            backClicked: true
        };
    }

    private notifyListenerIfPresent(result: ScreenResult<TCurrentScreen, ScreenDefinitions>) {
        const params = this.route.params as unknown as FullParams<
            TCurrentScreen,
            ScreenDefinitions
        >;

        if (!!params?.listenerId) {
            const listener: NavigationListener<ScreenResult<TCurrentScreen, ScreenDefinitions>> =
                this.navigationListeners[params.listenerId];
            if (listener) {
                listener(result);
                delete this.navigationListeners[params.listenerId];
            }
        }
    }

    async completeAndGoBack(
        result?: ScreenOutput<TCurrentScreen, ScreenDefinitions>
    ): Promise<void> {
        if (this.hasGoneBack || this.isGoingBack) {
            return;
        }
        this.hasGoneBack = true;
        this.isGoingBack = true;
        this.notifyListenerIfPresent({ result });
        this.navigation.goBack();
        this.isGoingBack = false;
    }

    async goBack() {
        if (this.hasGoneBack || this.isGoingBack) {
            return;
        }
        this.hasGoneBack = true;
        this.isGoingBack = true;
        this.onGoBackListener?.();
        this.notifyListenerIfPresent({
            backClicked: true
        });
        this.navigation?.goBack();
        this.isGoingBack = false;
    }

    async goBackFromScreenIfStillPresent() {
        if (!this.hasGoneBack) {
            this.goBack();
        }
    }
}

export function useAsyncNavigation<TScreen extends Screens = any>(
    screen?: TScreen
): {
    params: ScreenInput<TScreen, ScreenDefinitions>;
    navigator: Navigator<TScreen>;
    navigation: NavigationProp<any, any>;
} {
    const navigation = useNavigation();
    const route = useRoute();
    const { navigationListeners } = useContext(AsyncNavigationContext);
    const navigator = useMemo(
        () => new Navigator<TScreen>(navigation, route, navigationListeners),
        []
    );
    return {
        navigator,
        navigation,
        params: route.params as ScreenInput<TScreen, ScreenDefinitions>
    };
}

type NavigationListener<T = any> = (result: T) => void;
type NavigationListenerStorage = Record<string, NavigationListener>;
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

    if (!isReady) {
        return null;
    }
    return (
        <AsyncNavigationContext.Provider
            value={{ navigationListeners: navigationListeners.current }}>
            <NavigationContainer
                initialState={initialState}
                onStateChange={state =>
                    GlobalStorage.set(NAVIGATION_PERSISTENCE_KEY, JSON.stringify(state))
                }>
                {children}
            </NavigationContainer>
        </AsyncNavigationContext.Provider>
    );
};
