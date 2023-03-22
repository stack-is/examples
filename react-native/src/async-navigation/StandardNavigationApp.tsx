import { Column, Row } from '../common/Components';
import { Alert, Button, FlatList, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    callApiToPayInvoice,
    Card,
    CARDS,
    CURRENCIES,
    Currency,
    Invoice,
    INVOICES
} from './Boilerplate';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MODAL_ANIMATION_DURATION } from './AsyncNavigation';
import { now, Styles } from '../common/Utilities';
import { differenceInDays, format, isBefore } from 'date-fns';
import DatePicker from 'react-native-date-picker';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from 'react-native-screens/native-stack';
import { RouteProp } from '@react-navigation/core/src/types';

const StandardNavigationStack = createNativeStackNavigator<StackParamList>();

enum Screens {
    InvoiceList = 'InvoiceList',
    InvoiceDetail = 'InvoiceDetail',
    Authentication = 'Authentication',
    SelectCard = 'SelectCard',
    SelectCurrency = 'SelectCurrency',
    SelectDate = 'SelectDate'
}
type StackParamList = {
    [Screens.InvoiceList]: { invoice: Invoice };
    [Screens.InvoiceDetail]: {
        screenToNavigateBackTo: Screens;
        invoice: Invoice;
        authenticationResult?: { authenticationSuccessful?: boolean };
        selectCardResult?: { selectedCard?: Card };
        selectCurrencyResult?: { selectedCurrency?: Currency };
        selectDateResult?: { selectedDate?: number };
    };
    [Screens.Authentication]: {
        screenToNavigateBackTo: Screens;
    };
    [Screens.SelectCard]: {
        screenToNavigateBackTo: Screens;
    };
    [Screens.SelectCurrency]: {
        screenToNavigateBackTo: Screens;
    };
    [Screens.SelectDate]: {
        screenToNavigateBackTo: Screens;
        defaultSelection?: number;
        maxDate?: number;
        minDate?: number;
    };
};
export const StandardNavigationApp: React.FC = () => (
    <NavigationContainer>
        <StandardNavigationStack.Navigator initialRouteName={Screens.InvoiceList}>
            <StandardNavigationStack.Screen
                name={Screens.InvoiceList}
                component={InvoiceListScreen}
            />
            <StandardNavigationStack.Screen
                name={Screens.InvoiceDetail}
                component={InvoiceDetailScreen}
            />
            <StandardNavigationStack.Group
                screenOptions={{
                    presentation: 'modal',
                    animationDuration: MODAL_ANIMATION_DURATION
                }}>
                <StandardNavigationStack.Screen
                    name={Screens.Authentication}
                    component={AuthenticationScreen}
                />
                <StandardNavigationStack.Screen
                    name={Screens.SelectCard}
                    component={SelectCardScreen}
                />
                <StandardNavigationStack.Screen
                    name={Screens.SelectCurrency}
                    component={SelectCurrencyScreen}
                />
                <StandardNavigationStack.Screen
                    name={Screens.SelectDate}
                    component={SelectDateScreen}
                />
            </StandardNavigationStack.Group>
        </StandardNavigationStack.Navigator>
    </NavigationContainer>
);

function useStandardNavigation<T extends keyof StackParamList>() {
    const navigation = useNavigation<NativeStackNavigationProp<StackParamList, T>>();
    const route = useRoute<RouteProp<StackParamList, T>>();
    return { navigation, route };
}
const InvoiceListScreen = () => {
    const { navigation, route } = useStandardNavigation<Screens.InvoiceList>();
    const [invoices, setInvoices] = useState([...INVOICES]);
    const updateInvoice = useCallback((invoice: Invoice) => {
        const newInvoices = [...invoices];
        const index = newInvoices.findIndex(x => x.id === invoice.id);
        newInvoices[index] = invoice;
        setInvoices(newInvoices);
    }, []);

    useEffect(() => {
        if (route.params?.invoice) {
            // Invoice updated from Invoice Detail, need to update list
            updateInvoice(route.params.invoice);
        }
    }, [route.params?.invoice]);

    return (
        <FlatList
            data={invoices}
            keyExtractor={x => x.id.toString()}
            ItemSeparatorComponent={() => (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'black' }} />
            )}
            renderItem={info => {
                const invoice = info.item;
                const dueInDays = differenceInDays(invoice.dueDate, now());
                let textColor = 'black';
                if (invoice.paid) {
                    textColor = 'green';
                } else {
                    if (dueInDays < 0) {
                        textColor = 'red';
                    } else if (dueInDays === 0) {
                        textColor = 'orange';
                    }
                }
                return (
                    <TouchableHighlight
                        underlayColor="rgba(255, 255, 255, 0.0)"
                        activeOpacity={0.5}
                        onPress={() =>
                            navigation.push(Screens.InvoiceDetail, {
                                screenToNavigateBackTo: Screens.InvoiceList,
                                invoice
                            })
                        }>
                        <Row style={{ padding: 16, borderRadius: 8, backgroundColor: 'white' }}>
                            <Column style={{ flex: 1 }}>
                                <Text style={{ flex: 1 }}>{invoice.name}</Text>
                                <Row style={{ alignContent: 'flex-end' }}>
                                    <Text>
                                        Status:{' '}
                                        <Text style={{ fontStyle: 'italic' }}>
                                            {invoice.paid ? 'Paid!' : 'Not paid'}
                                        </Text>
                                    </Text>
                                </Row>
                            </Column>
                            <Column>
                                <Text
                                    style={{
                                        color: textColor,
                                        textAlign: 'right'
                                    }}>{`${invoice.amount} ${invoice.currency}`}</Text>
                                {invoice.paid ? null : <Text>{`Due in ${dueInDays} days`}</Text>}
                            </Column>
                        </Row>
                    </TouchableHighlight>
                );
            }}
        />
    );
};
const InvoiceDetailScreen = () => {
    const { navigation, route } = useStandardNavigation<Screens.InvoiceDetail>();
    const { params } = route;
    const { invoice, screenToNavigateBackTo } = params;

    const [selectedCard, setSelectedCard] = useState<Card | undefined>(undefined);
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState<number>(now());

    const completePayment = useCallback(
        async (
            card: Card | undefined,
            currency: Currency | undefined,
            date: number | undefined
        ) => {
            if (!card || !currency || !date) {
                Alert.alert('Error', 'Please select a card, currency and date');
                return;
            }
            Alert.alert(
                'Paying...',
                `Calling API with: 
Card: ${card?.number}
Currency: ${currency}
Date: ${format(date, 'dd/MM/yyyy')}`
            );
            await callApiToPayInvoice(invoice.id, card.id, currency, date);

            invoice.paid = true;

            // The flow is complete and we need to go back to the previous screen.
            // We passed the screen to navigate back to via the params but the type is most likely different for each of them
            switch (screenToNavigateBackTo) {
                case Screens.InvoiceList:
                    navigation.navigate(Screens.InvoiceList, { invoice });
                    break;
                default:
                    throw new Error(`Unknown screenToNavigateBackTo: ${screenToNavigateBackTo}`);
            }
        },
        []
    );

    useEffect(() => {
        if (params?.authenticationResult && params.authenticationResult.authenticationSuccessful) {
            //Authentication completed successfully, continue flow
            navigation.navigate(Screens.SelectCard, {
                screenToNavigateBackTo: Screens.InvoiceDetail
            });
        }
        //Remember to clear params to prevent incorrect result in the future
        navigation.setParams({ authenticationResult: undefined });
    }, [params?.authenticationResult]);

    useEffect(() => {
        if (params?.selectCardResult && !!params.selectCardResult.selectedCard) {
            //Card selected successfully, continue flow
            const card = params.selectCardResult.selectedCard;
            setSelectedCard(card);
            setSelectedCurrency(card.currency);
            if (card.currency !== invoice.currency) {
                navigation.navigate(Screens.SelectCurrency, {
                    screenToNavigateBackTo: Screens.InvoiceDetail
                });
            } else if (isBefore(selectedDate, invoice.dueDate)) {
                //Invoice due date is in the future, let's pick a date to pay it at
                navigation.navigate(Screens.SelectDate, {
                    screenToNavigateBackTo: Screens.InvoiceDetail,
                    defaultSelection: selectedDate,
                    minDate: now(),
                    maxDate: invoice.dueDate
                });
            } else {
                //Invoice due date is in the past, pay it now
                completePayment(card, card.currency, now());
            }
        }
        //Remember to clear params to prevent incorrect result in the future
        navigation.setParams({ selectCardResult: undefined });
    }, [params?.selectCardResult]);

    useEffect(() => {
        if (params?.selectCurrencyResult && params.selectCurrencyResult.selectedCurrency) {
            //Currency selected successfully, continue flow
            const currency = params.selectCurrencyResult.selectedCurrency;
            setSelectedCurrency(currency);
            if (isBefore(selectedDate, invoice.dueDate)) {
                //Invoice due date is in the future, let's pick a date to pay it at
                navigation.navigate(Screens.SelectDate, {
                    screenToNavigateBackTo: Screens.InvoiceDetail,
                    defaultSelection: selectedDate,
                    minDate: now(),
                    maxDate: invoice.dueDate
                });
            } else {
                //Invoice due date is in the past, pay it now
                completePayment(selectedCard, currency, now());
            }
        }
        //Remember to clear params to prevent incorrect result in the future
        navigation.setParams({ selectCurrencyResult: undefined });
    }, [params?.selectCurrencyResult]);

    useEffect(() => {
        if (params?.selectDateResult && !!params.selectDateResult.selectedDate) {
            //Date selected successfully, complete flow with API call
            completePayment(selectedCard, selectedCurrency, params.selectDateResult.selectedDate);
        }
        //Remember to clear params to prevent incorrect result in the future
        navigation.setParams({ selectDateResult: undefined });
    }, [params?.selectDateResult]);
    return (
        <Column style={{ padding: 16, borderRadius: 8, backgroundColor: 'white' }}>
            <Row>
                <Text style={{ flex: 1 }}>{invoice.name}</Text>
                <Text>{`${invoice.amount} ${invoice.currency}`}</Text>
            </Row>
            <Row style={{ alignContent: 'flex-end' }}>
                <Text>
                    Status:{' '}
                    <Text style={{ fontStyle: 'italic' }}>
                        {invoice.paid ? 'Paid!' : 'Not paid'}
                    </Text>
                </Text>
            </Row>
            <Button
                title="Pay"
                onPress={() =>
                    navigation.navigate(Screens.Authentication, {
                        screenToNavigateBackTo: Screens.InvoiceDetail
                    })
                }
            />
        </Column>
    );
};
const AuthenticationScreen = () => {
    const { navigation, route } = useStandardNavigation<Screens.Authentication>();
    const { params } = route;
    const { screenToNavigateBackTo } = params;

    const completeAuthentication = useCallback((successful: boolean) => {
        switch (screenToNavigateBackTo) {
            case Screens.InvoiceDetail:
                navigation.navigate({
                    name: screenToNavigateBackTo,
                    params: {
                        authenticationResult: { authenticationSuccessful: successful }
                        //This as StackParamList is so Typescript doesn't complain about missing required parameters which we know exist because this will be merged
                    } as StackParamList[Screens.InvoiceDetail],
                    merge: true
                });
                break;
        }
    }, []);
    return (
        <Column style={{ padding: 16, borderRadius: 8, backgroundColor: 'white' }}>
            <Text style={[Styles.h4, { textAlign: 'center', marginBottom: 16 }]}>
                Please authenticate yourself
            </Text>
            <Button title="Successful" onPress={() => completeAuthentication(true)} />
            <Button title="Not successful" onPress={() => completeAuthentication(false)} />
            <Button title="Cancelled" onPress={() => navigation.goBack()} />
        </Column>
    );
};
const SelectCardScreen = () => {
    const { navigation, route } = useStandardNavigation<Screens.SelectCard>();
    navigation.setOptions({
        headerRight: () => <Button title="Close" onPress={() => navigation.goBack()} />
    } as any);
    const { params } = route;
    const { screenToNavigateBackTo } = params;
    const completeSelection = useCallback((selectedCard: Card) => {
        switch (screenToNavigateBackTo) {
            case Screens.InvoiceDetail:
                navigation.navigate({
                    name: screenToNavigateBackTo,
                    params: {
                        selectCardResult: { selectedCard }
                        //This as StackParamList is so Typescript doesn't complain about missing required parameters which we know exist because this will be merged
                    } as StackParamList[Screens.InvoiceDetail],
                    merge: true
                });
                break;
        }
    }, []);
    return (
        <FlatList
            data={CARDS}
            keyExtractor={x => x.id.toString()}
            ItemSeparatorComponent={() => (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'black' }} />
            )}
            renderItem={info => {
                const card = info.item;
                return (
                    <TouchableHighlight
                        underlayColor="rgba(255, 255, 255, 0.0)"
                        activeOpacity={0.5}
                        onPress={() => completeSelection(card)}>
                        <Column style={{ padding: 16, borderRadius: 8, backgroundColor: 'white' }}>
                            <Row>
                                <Text style={{ flex: 1 }}>{card.number}</Text>
                                <Text>{card.currency}</Text>
                            </Row>
                        </Column>
                    </TouchableHighlight>
                );
            }}></FlatList>
    );
};
const SelectCurrencyScreen = () => {
    const { navigation, route } = useStandardNavigation<Screens.SelectCurrency>();
    navigation.setOptions({
        headerRight: () => <Button title="Close" onPress={() => navigation.goBack()} />
    } as any);
    const { params } = route;
    const { screenToNavigateBackTo } = params;
    const completeSelection = useCallback((selectedCurrency: Currency) => {
        switch (screenToNavigateBackTo) {
            case Screens.InvoiceDetail:
                navigation.navigate({
                    name: screenToNavigateBackTo,
                    params: {
                        selectCurrencyResult: { selectedCurrency }
                        //This as StackParamList is so Typescript doesn't complain about missing required parameters which we know exist because this will be merged
                    } as StackParamList[Screens.InvoiceDetail],
                    merge: true
                });
                break;
        }
    }, []);
    return (
        <FlatList
            data={CURRENCIES}
            keyExtractor={x => x}
            ItemSeparatorComponent={() => (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'black' }} />
            )}
            renderItem={info => {
                const currency = info.item;
                return (
                    <TouchableHighlight
                        underlayColor="rgba(255, 255, 255, 0.0)"
                        activeOpacity={0.5}
                        onPress={() => completeSelection(currency)}>
                        <Column style={{ padding: 16, borderRadius: 8, backgroundColor: 'white' }}>
                            <Text>{currency}</Text>
                        </Column>
                    </TouchableHighlight>
                );
            }}></FlatList>
    );
};
const SelectDateScreen = () => {
    const { navigation, route } = useStandardNavigation<Screens.SelectDate>();
    navigation.setOptions({
        headerRight: () => <Button title="Close" onPress={() => navigation.goBack()} />
    } as any);
    const { params } = route;
    const { screenToNavigateBackTo, defaultSelection, minDate, maxDate } = params;
    const [date, setDate] = useState(defaultSelection ? new Date(defaultSelection) : new Date());

    const completeSelection = useCallback((selectedDate: Date) => {
        switch (screenToNavigateBackTo) {
            case Screens.InvoiceDetail:
                navigation.navigate({
                    name: screenToNavigateBackTo,
                    params: {
                        selectDateResult: { selectedDate: selectedDate.getTime() }
                        //This as StackParamList is so Typescript doesn't complain about missing required parameters which we know exist because this will be merged
                    } as StackParamList[Screens.InvoiceDetail],
                    merge: true
                });
                break;
        }
    }, []);

    return (
        <Column style={{ alignItems: 'center' }}>
            <DatePicker
                date={date}
                onDateChange={setDate}
                maximumDate={maxDate ? new Date(maxDate) : undefined}
                minimumDate={minDate ? new Date(minDate) : undefined}
                mode="date"
            />
            <Button title="Select" onPress={() => completeSelection(date)} />
        </Column>
    );
};
