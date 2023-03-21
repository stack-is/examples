import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Column, Row } from '../common/Components';
import { INVOICES } from './Boilerplate';

const StandardNavigationStack = createNativeStackNavigator();

export const StandardNavigationScreen = {
    InvoiceList: 'InvoiceList',
    InvoiceDetail: 'InvoiceDetail',
    Authentication: 'Authentication',
    SelectCard: 'SelectCard',
    SelectCurrency: 'SelectCurrency',
    SelectDate: 'SelectDate'
} as const;

export const StandardNavigationNavigator: React.FC = () => (
    <StandardNavigationStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={StandardNavigationScreen.InvoiceList}>
        <StandardNavigationStack.Screen
            name={StandardNavigationScreen.InvoiceList}
            component={InvoiceListScreen}
        />
    </StandardNavigationStack.Navigator>
);

const InvoiceListScreen = () => {
    const navigation = useNavigation<any>();
    const [invoices, setInvoices] = useState([...INVOICES]);
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
                        onPress={() =>
                            navigation.navigate(StandardNavigationScreen.InvoiceDetail, {
                                id: invoice.id
                            })
                        }>
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
