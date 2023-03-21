import React from 'react';
import { View, ViewProps } from 'react-native';

export const Column: React.FC<ViewProps> = ({ style, children, ...props }) => {
    return (
        <View style={[{ flexDirection: 'column' }, style]} {...props}>
            {children}
        </View>
    );
};

export const Row: React.FC<ViewProps> = ({ style, children, ...props }) => {
    return (
        <View style={[{ flexDirection: 'row' }, style]} {...props}>
            {children}
        </View>
    );
};
