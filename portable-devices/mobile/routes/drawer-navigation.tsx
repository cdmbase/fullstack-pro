import React, { ComponentType, useEffect, Component } from 'react';
import { Text, View } from 'react-native';
import { matchRoutes } from 'react-router-config';
import { Redirect } from "react-router-dom"
import { NavigationHelpers, Route } from '@react-navigation/native';
import { nanoid } from 'nanoid/non-secure';
//import { createHistoryNavigator } from './create-history-navigator';
import { drawerHistoryNavigator } from "./drawer-history-navigator"
import { IRoute as IRouteProps, IRouteComponentProps } from '@common-stack/client-react';
import { History } from 'history';
import { matchPath, __RouterContext as RouterContext } from 'react-router';

const { Navigator, Screen } = drawerHistoryNavigator();

interface INavigationProps {
    routes: IRouteProps[];
    history: History<any>;
    location?: string;
    defaultTitle?: string;
    initialRouteName: string;
    screenOptions: any;
    // getMatchedRoute: (route: any) => void
    [key: string]: any;
}

interface IScreen {
    key: string;
    name: string;
    component: ComponentType<any>;
    options: {
        routeMatchOpts: IRouteProps;
        sensitive?: boolean;
        title?: string;
        [key: string]: any;
    };
}

export interface IScreenComponentProps extends IRouteComponentProps {
    screen: Route<any>;
    navigation: NavigationHelpers<any, any>;
}


function flattenRoutes(routes?: IRouteProps[], parent?: IScreen): IScreen[] {
    if (!Array.isArray(routes)) return [];
    const screens: IScreen[] = [];
    for (let idx = 0; idx < routes.length; idx++) {
        const route = routes[idx];
        const { key: routeKey, path, exact, component, strict, redirect, routes: children, ...options } = route;
        const screenKey = routeKey || nanoid();
        if (path !== '/') {
            const screen: IScreen = {
                key: screenKey,
                name: path || '/',
                component: function ScreenComponent(props) {
                    if (redirect) {
                        return <Redirect from={path} to={redirect} exact={exact} strict={strict} />;
                    }
                    const children = component ? React.createElement(component, props) : null;
                    return parent && parent.component ? React.createElement(parent.component, props, children) : children;
                },
                options: {
                    ...options,
                    routeMatchOpts: route,
                },
            };
            if (Array.isArray(children) && children.length > 0) {
                screens.push(...flattenRoutes(children, screen));
            } else {
                screens.push(screen);
            }
        }

    }
    return screens;
}

export function DrawerNavigation(props: INavigationProps): JSX.Element {
    const { history, routes, defaultTitle, ...rest } = props;
    console.log('--_DRAIER', location);
    const initialRouteName = props.initial;

    const screenOptions = props.screenOptions;

    useEffect(() => {
        function routeChangeHandler(location: any, action?: string) {
            const matchedRoutes = matchRoutes(props.routes, location.pathname);
            console.log('--ROUTE CHANGED', matchedRoutes);

        }
        routeChangeHandler(history.location, 'POP');
        return history.listen(routeChangeHandler);
    }, [history]);


    const screens = flattenRoutes(routes);
    console.log('---screens', screens);
    if (__DEV__) {
        if (!screens || screens.length === 0) {
            return (
                <Navigator initialRouteName="notFound" history={history}>
                    <Screen
                        name="notFound"
                        component={() => (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#f4333c' }}>404</Text>
                                <Text style={{ fontSize: 14, color: '#f4333c' }}>Please implement an index page under the pages/ directory.</Text>
                            </View>
                        )}
                    />
                </Navigator>
            );
        }
    }

    const intialMatch = {
        path: initialRouteName,
        params: {},
        isExact: true,
        url: initialRouteName,
    };
    return (
        <Navigator initialRouteName={initialRouteName} history={history} screenOptions={screenOptions}>
            {screens.map(({ key, component: Component, options: { routeMatchOpts, title, ...options }, ...rest }, idx) => (
                <Screen
                    {...rest}
                    key={key || `screen_${idx}`}
                    options={{
                        ...options,
                        title: title || defaultTitle,
                    }}
                >
                    {(props) => {
                        const context = {
                            history,
                            location: history.location,
                            match: matchPath(history.location.pathname, routeMatchOpts) || intialMatch,
                        };
                        const newProps = {
                            ...rest,
                            ...context,
                            ...props,
                        };
                        return (
                            <RouterContext.Provider value={context}>
                                <Component {...newProps} />
                            </RouterContext.Provider>
                        )
                    }}

                </Screen>
            ))}
        </Navigator>
    )
}

