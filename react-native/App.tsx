import React from 'react';
import { AsyncNavigationApp } from './src/async-navigation/AsyncNavigationApp';
import { StandardNavigationApp } from './src/async-navigation/StandardNavigationApp';

export const App: React.FC = () => {
    // return <StandardNavigationApp />;
    return <AsyncNavigationApp />;
};
