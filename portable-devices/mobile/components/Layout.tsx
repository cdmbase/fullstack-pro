import React, {useState} from 'react';
import { Feature, FeatureWithRouterFactory } from '@common-stack/client-react';
import {MainHeader, DrawerRoute} from "../modules";
import * as RootNavigation from "../routes/root-navigation"
import { connect } from 'react-redux';
import {Dashboard} from "../pages"
import counterModules from "../modules/counter-module"

const features = new Feature(FeatureWithRouterFactory, counterModules);

const Layout = ({history, location}: any) => {
    const routes = features.getConfiguredRoutes()
    let subRoutes = routes.find((route: any) => route.routes && route)
    const [route, setRoute] = useState<any>({})
    const getMatchedRoute = (route: any) => {
        setRoute(route)
    }
    return(
        <>
            <MainHeader title={route?.title} navigation={RootNavigation}/>
            <DrawerRoute history={history} getMatchedRoute={getMatchedRoute} location={location} routes={routes}/>
        </>
    )
}

export const ProLayout = connect(({ settings, router }: any) => ({
    settings,
    location: router.location,
}))(Layout);

export default new Feature({
    routeConfig: [
        {
            ['/org']:{
                exact:true,
                component: ProLayout
            },
        },
        {
            ['/']:{
                exact: true,
                component: Dashboard,
            }
        }
    ],
});