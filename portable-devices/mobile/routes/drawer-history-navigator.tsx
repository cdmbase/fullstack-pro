import * as React from 'react';
import { Platform, Text } from 'react-native';
import {
    createNavigatorFactory,
    useNavigationBuilder,
    DrawerRouter,
    DrawerActions,
    DefaultNavigatorOptions,
    EventArg,
    NavigationHelpersContext
} from '@react-navigation/native';
import { DrawerRouterOptions, DrawerNavigationState } from '@react-navigation/routers/lib/typescript/src/DrawerRouter';
import {
    DrawerNavigationEventMap,
    DrawerNavigationConfig,
    DrawerNavigationOptions
} from '@react-navigation/drawer/lib/typescript/src/types';
import { Location, Action } from 'history';
import { parse, stringify } from 'querystring';
import { DrawerView, createDrawerNavigator } from '@react-navigation/drawer';

import SideBar from "../components/SideBar"

function HistoryNavigator({
    initialRouteName,
    children,
    screenOptions,
    history,
    ...rest
}: DefaultNavigatorOptions<DrawerNavigationOptions> & DrawerRouterOptions & DrawerNavigationConfig & { history: any }) {
    const defaultOptions = {
        gestureEnabled: Platform.OS === 'ios',
        animationEnabled: Platform.OS !== 'web',
    };
    const { descriptors, state, navigation } = useNavigationBuilder<
    DrawerNavigationState<any>,
        DrawerRouterOptions,
        any,
        DrawerNavigationOptions,
        DrawerNavigationEventMap
    >(DrawerRouter, {
        initialRouteName,
        children,
        screenOptions:
            typeof screenOptions === 'function'
                ? (...args) => ({
                    ...defaultOptions,
                    ...screenOptions(...args),
                })
                : {
                    ...defaultOptions,
                    ...screenOptions,
                },
    });

    React.useEffect(
        () =>
            navigation.addListener &&
            navigation.addListener('itemPress', (e: any) => {
                const isFocused = navigation.isFocused();

                // Run the operation in the next frame so we're sure all listeners have been run
                // This is necessary to know if preventDefault() has been called
                requestAnimationFrame(() => {
                    if (state.index > 0 && isFocused && !(e as EventArg<'itemPress', true>).defaultPrevented) {
                        // When user taps on already focused drawerItem,
                        // close the drawer
                        navigation.dispatch({
                            ...DrawerActions.closeDrawer(),
                            target: state.key,
                        });
                    }
                });
            }),
        [navigation, state.index, state.key],
    );

    React.useEffect(
        () =>
            history.listen((location: Location<any>, action: Action): void => {
                const state = navigation.dangerouslyGetState();
                if (state.routeNames.includes(location.pathname)) {
                    switch (action) {
                        case 'POP':
                            if (state.index > history.index) {
                                navigation.dispatch(DrawerActions.closeDrawer());
                            }
                            break;
                        case 'PUSH':
                            if (state.index < history.index) {
                                navigation.dispatch(DrawerActions.openDrawer());
                            }
                            break;
                        case 'REPLACE':
                            if (state.index === history.index) {
                                navigation.dispatch(DrawerActions.jumpTo(location.pathname, parse(location.search.replace('?', ''))));
                            }
                            break;
                    }
                }
            }),
        [navigation, history, state],
    );

/*     React.useEffect(() => {
        if (history.index > state.index) {
            debugger
            const route = state.routes[history.index];
            if (route) {
                history.push(route.params ? `${route.name}?${stringify(route.params)}` : route.name);
            }
        } else if (history.index < state.index) {
            debugger
            const route = state.routes[state.index];
            if (route) {
                history.push(route.params ? `${route.name}?${stringify(route.params)}` : route.name);
            }
        }
    }, [state.index, history]); */

    return <DrawerView {...rest} drawerContent={(props) =>
        <SideBar descriptors={descriptors} state={state} navigation={navigation}/>
    } descriptors={descriptors} state={state} navigation={navigation} />;
}

export const drawerHistoryNavigator = createNavigatorFactory<
    DrawerNavigationState<any>,
    DrawerNavigationOptions,
    DrawerNavigationEventMap,
    typeof HistoryNavigator
>(HistoryNavigator);