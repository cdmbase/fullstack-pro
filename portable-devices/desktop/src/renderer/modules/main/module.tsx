import * as React from 'react';
import { Layout } from 'antd';
import counterModules from '@sample-stack/counter-module-browser';
import { Feature, FeatureWithRouterFactory } from '@common-stack/client-react';
import { SiderMenu } from '../../components/layout';

const features = new Feature(FeatureWithRouterFactory, counterModules);

export const MainRoute = (props) => (
    <Layout hasSider style={{ minHeight: '100vh', display: 'flex' }}>
        <SiderMenu
            collapsed={false}
            menuData={features.getMenus()}
            location={window.location as any}
            segments={features.sidebarSegments}
        />
        <Layout>
            <Layout.Content style={{ height: '100%' }}>
                <section className="flex-grow" style={{ height: '100%' }}>
                    {features.getRoutes()}
                </section>
            </Layout.Content>
        </Layout>
    </Layout>
);

export default features;
