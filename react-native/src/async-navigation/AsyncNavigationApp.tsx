import { Column, Row } from '../common/Components';
import { Alert, Button, FlatList, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import React, { useCallback, useState } from 'react';
import { callApiToPayInvoice, CARDS, CURRENCIES, Invoice, INVOICES } from './Boilerplate';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
    AsyncNavigationContainer,
    MODAL_ANIMATION_DURATION,
    Screens,
    useAsyncNavigation
} from './AsyncNavigation';
import { now, Styles } from '../common/Utilities';
import { differenceInDays, format, isAfter, isBefore } from 'date-fns';
import DatePicker from 'react-native-date-picker';

const AsyncNavigationStack = createNativeStackNavigator();

export const AsyncNavigationApp: React.FC = () => (
    <AsyncNavigationContainer>
        <AsyncNavigationStack.Navigator initialRouteName={Screens.InvoiceList}>
            <AsyncNavigationStack.Screen name={Screens.InvoiceList} component={InvoiceListScreen} />
            <AsyncNavigationStack.Screen
                name={Screens.InvoiceDetail}
                component={InvoiceDetailScreen}
            />
            <AsyncNavigationStack.Group
                screenOptions={{
                    presentation: 'modal',
                    animationDuration: MODAL_ANIMATION_DURATION
                }}>
                <AsyncNavigationStack.Screen
                    name={Screens.Authentication}
                    component={AuthenticationScreen}
                />
                <AsyncNavigationStack.Screen
                    name={Screens.SelectCard}
                    component={SelectCardScreen}
                />
                <AsyncNavigationStack.Screen
                    name={Screens.SelectCurrency}
                    component={SelectCurrencyScreen}
                />
                <AsyncNavigationStack.Screen
                    name={Screens.SelectDate}
                    component={SelectDateScreen}
                />
            </AsyncNavigationStack.Group>
        </AsyncNavigationStack.Navigator>
    </AsyncNavigationContainer>
);
const InvoiceListScreen = () => {
    const { navigator } = useAsyncNavigation(Screens.InvoiceList);
    const [invoices, setInvoices] = useState([...INVOICES]);
    const updateInvoice = useCallback((invoice: Invoice) => {
        const newInvoices = [...invoices];
        const index = newInvoices.findIndex(x => x.id === invoice.id);
        newInvoices[index] = invoice;
        setInvoices(newInvoices);
    }, []);
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
                        onPress={async () => {
                            const { result } = await navigator.push(Screens.InvoiceDetail, invoice);
                            if (!!result) {
                                updateInvoice(result);
                            }
                        }}>
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
    const { navigator, params: invoice } = useAsyncNavigation(Screens.InvoiceDetail);

    const onPayPressed = async () => {
        const { result: authenticationResult } = await navigator.navigate(
            Screens.Authentication,
            {}
        );
        if (!authenticationResult?.successful) {
            return;
        }
        const { result: card } = await navigator.push(Screens.SelectCard);
        if (!card) {
            return;
        }
        let currency = invoice.currency;
        if (currency !== card.currency) {
            const { result: selectedCurrency } = await navigator.push(Screens.SelectCurrency);
            if (!selectedCurrency) {
                return;
            }
            currency = selectedCurrency;
        }
        let paymentDate = now();
        if (isBefore(paymentDate, invoice.dueDate)) {
            //Invoice due date is in the future, let's pick a date to pay it at
            const { result: selectedDate } = await navigator.push(Screens.SelectDate, {
                defaultSelection: paymentDate,
                minDate: now(),
                maxDate: invoice.dueDate
            });
            if (!!selectedDate) {
                paymentDate = selectedDate;
            } else {
                //If nothing was selected, let's just use today's date
            }
        } else {
            //Invoice due date is in the past, pay it now
        }

        Alert.alert(
            'Paying...',
            `Calling API with: 
Card: ${card.number}
Currency: ${currency}
Date: ${format(paymentDate, 'dd/MM/yyyy')}`
        );
        await callApiToPayInvoice(invoice.id, card.id, currency, paymentDate);

        invoice.paid = true;
        await navigator.completeAndGoBack(invoice);
    };
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
            <Button title="Pay" onPress={onPayPressed} />
        </Column>
    );
};
const AuthenticationScreen = () => {
    const { navigator } = useAsyncNavigation(Screens.Authentication);
    return (
        <Column style={{ padding: 16, borderRadius: 8, backgroundColor: 'white' }}>
            <Text style={[Styles.h4, { textAlign: 'center', marginBottom: 16 }]}>
                Please authenticate yourself
            </Text>
            <Button
                title="Successful"
                onPress={() => navigator.completeAndGoBack({ successful: true })}
            />
            <Button
                title="Not successful"
                onPress={() => navigator.completeAndGoBack({ successful: false })}
            />
            <Button title="Cancelled" onPress={() => navigator.goBack()} />
        </Column>
    );
};
const SelectCardScreen = () => {
    const { navigator } = useAsyncNavigation(Screens.SelectCard, {
        headerRight: () => <Button title="Close" onPress={() => navigator.goBack()} />
    });
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
                        onPress={() => navigator.completeAndGoBack(card)}>
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
    const { navigator } = useAsyncNavigation(Screens.SelectCurrency, {
        headerRight: () => <Button title="Close" onPress={() => navigator.goBack()} />
    });
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
                        onPress={() => navigator.completeAndGoBack(currency)}>
                        <Column style={{ padding: 16, borderRadius: 8, backgroundColor: 'white' }}>
                            <Text>{currency}</Text>
                        </Column>
                    </TouchableHighlight>
                );
            }}></FlatList>
    );
};
const SelectDateScreen = () => {
    const { navigator, params } = useAsyncNavigation(Screens.SelectDate, {
        headerRight: () => <Button title="Close" onPress={() => navigator.goBack()} />
    });
    const { defaultSelection, minDate, maxDate } = params;

    const [date, setDate] = useState(defaultSelection ? new Date(defaultSelection) : new Date());

    return (
        <Column style={{ alignItems: 'center' }}>
            <DatePicker
                date={date}
                onDateChange={setDate}
                maximumDate={maxDate ? new Date(maxDate) : undefined}
                minimumDate={minDate ? new Date(minDate) : undefined}
                mode="date"
            />
            <Button title="Select" onPress={() => navigator.completeAndGoBack(date.getTime())} />
        </Column>
    );
};
