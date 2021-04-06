import * as React from "react";
import { IMenuPosition } from "@common-stack/client-react";
import { Feature } from "@common-stack/client-react";
import { Hello} from "../pages"
//import CounterScreen from "../pages/counter"

export enum CONNECTED_REACT_ROUTER_ROUTES_TYPES {
    TIMER = "/org/hello/timer",
}

export const getFilteredRoutes = (
    accountPageStore: [{ key: string; path: string; valid: boolean }],
    selectedRoutes: any
) =>
    accountPageStore
        .map((item) => {
            if (selectedRoutes.indexOf(item.key) !== -1) {
                const { path } = item;
                return {
                    [path]: item,
                };
            }
            return null;
        })
        .filter((valid) => valid);

export const counterPageStore: any = [
    {
        exact: true,
        icon: "export",
        name: "Timer",
        title: "Timer",
        component: Hello,
        position: IMenuPosition.MIDDLE,
        key: CONNECTED_REACT_ROUTER_ROUTES_TYPES.TIMER,
        path: CONNECTED_REACT_ROUTER_ROUTES_TYPES.TIMER,
    },  
];

const selectedRoutesAndMenus = [
    CONNECTED_REACT_ROUTER_ROUTES_TYPES.TIMER,
];

// get routes
const filteredRoutes = getFilteredRoutes(
    counterPageStore,
    selectedRoutesAndMenus
);

console.log('-FILERERED ORUTES', filteredRoutes);
export default new Feature({
    routeConfig: filteredRoutes as any,
});
