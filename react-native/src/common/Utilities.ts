import { MMKV } from 'react-native-mmkv';
import { nanoid } from 'nanoid/non-secure';

export const GlobalStorage = new MMKV({ id: 'Global' });

export function getRandomId() {
    return nanoid();
}
