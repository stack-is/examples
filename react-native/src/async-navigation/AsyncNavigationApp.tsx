import { Column, Row } from '../common/Components';
import { Button, FlatList, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import React, { useCallback, useState } from 'react';
import { Invoice, INVOICES } from './Boilerplate';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AsyncNavigationContainer, Screens, useAsyncNavigation } from './AsyncNavigation';

const AsyncNavigationStack = createNativeStackNavigator();
export const AsyncNavigationApp: React.FC = () => (
    <AsyncNavigationContainer>
        <AsyncNavigationStack.Navigator initialRouteName={Screens.InvoiceList}>
            <AsyncNavigationStack.Screen name={Screens.InvoiceList} component={InvoiceListScreen} />
            <AsyncNavigationStack.Screen
                name={Screens.InvoiceDetail}
                component={InvoiceDetailScreen}
            />
        </AsyncNavigationStack.Navigator>
    </AsyncNavigationContainer>
);
const InvoiceListScreen = () => {
    const { navigator } = useAsyncNavigation();
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
                        </Column>
                    </TouchableHighlight>
                );
            }}
        />
    );
};
const InvoiceDetailScreen = () => {
    const { navigator, params: invoice } = useAsyncNavigation(Screens.InvoiceDetail);

    const onPayPressed = async () => {
        // const { result } = await navigator.navigate(Screens.Authentication, {});
        // if (result?.successful) {
        invoice.name += 'TEST';
        navigator.completeAndGoBack(invoice);
        // }
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
