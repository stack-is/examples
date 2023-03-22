import { add } from 'date-fns';
import { sleep } from '../common/Utilities';

export type Invoice = {
    id: number;
    name: string;
    amount: number;
    currency: Currency;
    paid: boolean;
    dueDate: number;
};
export const INVOICES: Invoice[] = [
    {
        id: 1,
        name: 'Groceries',
        amount: 100,
        currency: 'USD',
        paid: false,
        dueDate: add(new Date(), { days: -1 }).getTime()
    },
    {
        id: 2,
        name: 'Rent',
        amount: 1000,
        currency: 'USD',
        paid: false,
        dueDate: add(new Date(), { days: 0 }).getTime()
    },
    {
        id: 3,
        name: 'Restaurant X',
        amount: 15,
        currency: 'EUR',
        paid: false,
        dueDate: add(new Date(), { days: 1 }).getTime()
    },
    {
        id: 4,
        name: 'Board game store',
        amount: 50,
        currency: 'USD',
        paid: false,
        dueDate: add(new Date(), { weeks: 1 }).getTime()
    },
    {
        id: 5,
        name: 'Café',
        amount: 4,
        currency: 'USD',
        paid: false,
        dueDate: add(new Date(), { months: 1 }).getTime()
    }
];

export type Card = {
    id: number;
    number: string;
    currency: Currency;
};

export const CARDS: Card[] = [
    {
        id: 1,
        number: '4111111111111111',
        currency: 'USD'
    },
    {
        id: 2,
        number: '4111111111111112',
        currency: 'EUR'
    },
    {
        id: 3,
        number: '4111111111111113',
        currency: 'USD'
    },
    {
        id: 4,
        number: '4111111111111114',
        currency: 'USD'
    }
];

export type Currency = 'USD' | 'EUR';
export const CURRENCIES: Currency[] = ['USD', 'EUR'];

export async function callApiToPayInvoice(
    invoiceId: number,
    cardId: number,
    currency: Currency,
    paymentDate: number
): Promise<void> {
    await sleep(1000);
    return;
}
