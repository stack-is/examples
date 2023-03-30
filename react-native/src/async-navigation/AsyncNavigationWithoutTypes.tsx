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
import {
    Alert,
    Button,
    FlatList,
    Linking,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {
    NavigationContainer,
    NavigationProp,
    RouteProp,
    useNavigation,
    useRoute
} from '@react-navigation/native';
import {
    callApiToPayInvoice,
    Card,
    CARDS,
    CURRENCIES,
    Currency,
    Invoice,
    INVOICES
} from './Boilerplate';
import { differenceInDays, differenceInMilliseconds, format, isBefore } from 'date-fns';
import { getRandomId, GlobalStorage, now, sleep, Styles } from '../common/Utilities';
import { NativeStackNavigationProp } from '@react-navigation/native-stack/lib/typescript/src/types';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack/src/types';
import { NavigationState } from '@react-navigation/routers';
import {
    AsyncNavigationContext,
    NavigationListener,
    NavigationListenerStorage,
    ScreenDefinitions,
    ScreenOutput
} from './AsyncNavigation';
import { Column, Row } from '../common/Components';
import DatePicker from 'react-native-date-picker';

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
export type CommonScreenInput =
    | {
          screen?: Screens;
          initial?: boolean;
      }
    | undefined;
export type ScreenResult<T> =
    | {
          backClicked: true;
          result: undefined;
      }
    | { backClicked: false; result: T };

export type FullParams<T> = T & {
    listenerId?: string;
};

enum NavigationType {
    Push = 'Push',
    Navigate = 'Navigate',
    Replace = 'Replace'
}

export class Navigator {
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

    async navigate<TIn = any, TOut = any>(
        screen: Screens,
        params: TIn & CommonScreenInput
    ): Promise<ScreenResult<TOut>> {
        return this.internalNavigate(NavigationType.Navigate, screen, params);
    }

    async replace<TIn = any, TOut = any>(
        screen: Screens,
        params: TIn & CommonScreenInput
    ): Promise<ScreenResult<TOut>> {
        return this.internalNavigate(NavigationType.Replace, screen, params);
    }

    async push<TIn = any, TOut = any>(
        screen: Screens,
        params: TIn & CommonScreenInput
    ): Promise<ScreenResult<TOut>> {
        return this.internalNavigate(NavigationType.Push, screen, params);
    }

    private async internalNavigate<TIn, TOut>(
        type: NavigationType,
        screen: Screens,
        input: TIn & CommonScreenInput
    ): Promise<ScreenResult<TOut>> {
        if (this.navigationAllowed) {
            this.lastNavigation = new Date();
            return new Promise<ScreenResult<TOut>>(resolve => {
                const listenerId = getRandomId();
                this.navigationListeners[listenerId] = resolve;
                const payload: FullParams<TOut> = {
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

    private notifyListenerIfPresent<TOut = any>(result: ScreenResult<TOut>) {
        const params = this.route.params as unknown as FullParams<TOut>;

        if (!!params?.listenerId) {
            const listener: NavigationListener<ScreenResult<TOut>> =
                this.navigationListeners[params.listenerId];
            if (listener) {
                listener(result);
                delete this.navigationListeners[params.listenerId];
            }
        }
    }

    private async internalGoBack<TOut = any>(result: ScreenResult<TOut>) {
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

    async completeAndGoBack<TOut = any>(result: TOut) {
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

export function useAsyncNavigation<TIn = any>(
    screen: Screens,
    options?: NativeStackNavigationOptions
): {
    params: TIn & CommonScreenInput;
    navigator: Navigator;
    navigation: NativeStackNavigationProp<any, any>;
} {
    const navigation = useNavigation() as NativeStackNavigationProp<any, any>;
    const route = useRoute();
    const { navigationListeners } = useContext(AsyncNavigationContext);
    const navigator = useMemo(
        () => new Navigator(screen, navigation, route, navigationListeners),
        []
    );
    useLayoutEffect(() => {
        if (options) {
            navigation.setOptions(options);
        }
    }, []);

    return {
        navigator,
        navigation,
        params: route.params as TIn & CommonScreenInput
    };
}
