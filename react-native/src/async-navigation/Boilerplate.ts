export type Invoice = {
    id: number;
    name: string;
    amount: number;
    currency: string;
    paid: boolean;
};
export const INVOICES: Invoice[] = [
    {
        id: 1,
        name: 'Groceries',
        amount: 100,
        currency: 'USD',
        paid: false
    },
    {
        id: 2,
        name: 'Rent',
        amount: 1000,
        currency: 'USD',
        paid: false
    },
    {
        id: 3,
        name: 'Restaurant X',
        amount: 15,
        currency: 'EUR',
        paid: false
    },
    {
        id: 4,
        name: 'Board game store',
        amount: 50,
        currency: 'USD',
        paid: false
    },
    {
        id: 5,
        name: 'Café',
        amount: 4,
        currency: 'USD',
        paid: false
    }
];
