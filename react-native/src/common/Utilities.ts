import { MMKV } from 'react-native-mmkv';
import { nanoid } from 'nanoid/non-secure';
import { StyleSheet } from 'react-native';

export const GlobalStorage = new MMKV({ id: 'Global' });

export function getRandomId() {
    return nanoid();
}

export function now() {
    return new Date().getTime();
}
export function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export const xxxxl = 40;
export const xxxl = 32;
export const xxl = 28;
export const xl = 22;
export const lg = 17;
export const md = 15;
export const base = 13;
export const sm = 11;

export const Styles = StyleSheet.create({
    h1: {
        fontSize: xxxxl,
        lineHeight: 1.2 * xxxxl
    },
    h2: {
        fontSize: xxxl,
        lineHeight: 1.2 * xxxl
    },
    h3: {
        fontSize: xxl,
        lineHeight: 1.2 * xxl
    },
    h4: {
        fontSize: xl,
        lineHeight: 1.2 * xl
    },
    h5: {
        fontSize: lg,
        lineHeight: 1.2 * lg
    }
});
