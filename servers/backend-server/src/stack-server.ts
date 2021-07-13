import * as http from 'http';
import * as express from 'express';
import { logger, logger as serverLogger } from '@cdm-logger/server';
import { Feature } from '@common-stack/server-core';
import { Container, ContainerModule, interfaces } from 'inversify';
import { ServiceBroker } from 'moleculer';
import { CommonType } from '@common-stack/core';
import * as _ from 'lodash';
import { applyMiddleware } from 'graphql-middleware';
import { shield } from 'graphql-shield';
import { CdmLogger } from '@cdm-logger/core';
import { expressApp } from './express-app';
import { GraphqlServer } from './server-setup/graphql-server';
import { config } from './config';
import { ConnectionBroker } from './connectors/connection-broker';
import * as brokerConfig from './config/moleculer.config';
import modules, { settings } from './modules';
import { GatewaySchemaBuilder } from './api/schema-builder';
import { WebsocketMultiPathServer } from './server-setup/websocket-multipath-update';
import { IModuleService } from './interfaces';
import { migrate } from './utils/migrations';
import { InterNamespaceMiddleware } from './middleware/moleculer-inter-namespace';
// This is temp and will be replaced one we add support for rules in Feature

type ILogger = CdmLogger.ILogger;

function startListening(port) {
    const server = this;
    return new Promise((resolve) => {
        server.listen(port, resolve);
    });
}

const infraModule = ({ broker, pubsub, mongoClient, logger }) =>
    new ContainerModule((bind: interfaces.Bind) => {
        bind('Logger').toConstantValue(logger);
        bind(CommonType.LOGGER).toConstantValue(logger);
        bind('Environment').toConstantValue(config.NODE_ENV || 'development');
        bind(CommonType.ENVIRONMENT).toConstantValue(config.NODE_ENV || 'development');
        bind('PubSub').toConstantValue(pubsub);
        bind(CommonType.PUBSUB).toConstantValue(pubsub);
        bind(CommonType.MOLECULER_BROKER).toConstantValue(broker);
        bind('MoleculerBroker').toConstantValue(broker);
        bind('MongoDBConnection').toConstantValue(mongoClient);
    });

/**
 *  Controls the lifecycle of the Application Server
 *
 * @export
 * @class StackServer
 */
export class StackServer {
    public httpServer: http.Server & { startListening?: (port) => void };

    private app: express.Express;

    private logger: ILogger;

    private connectionBroker: ConnectionBroker;

    private mainserviceBroker: ServiceBroker;

    private microserviceBroker: ServiceBroker;

    private multiPathWebsocket: WebsocketMultiPathServer;

    private serviceContainer: Container;

    private microserviceContainer: Container;

    constructor() {
        this.logger = serverLogger.child({ className: 'StackServer' });
    }

    public async initialize() {
        this.logger.info('StackServer initializing');

        this.connectionBroker = new ConnectionBroker(brokerConfig.transporter, this.logger);
        const redisClient = this.connectionBroker.redisDataloaderClient;

        const mongoClient = await this.connectionBroker.mongoConnection;

        // Moleculer Broker Setup
        this.mainserviceBroker = new ServiceBroker({
            ...brokerConfig,
            middlewares: [
                InterNamespaceMiddleware([
                    {
                        namespace: 'api-admin',
                        transporter: brokerConfig.transporter,
                    },
                ]),
            ],
            started: async () => {
                await modules.preStart(this.serviceContainer);
                if (config.NODE_ENV === 'development') {
                    // await modules.microservicePreStart(this.micorserviceContainer);
                }

                await modules.postStart(this.serviceContainer);
                await migrate(mongoClient, this.serviceContainer);
                // start DB migration

                if (config.NODE_ENV === 'development') {
                    // await modules.microservicePostStart(this.micorserviceContainer);
                }
            },

            // created,
            async created() {
                return Promise.resolve();
            },
        });

        if (config.NODE_ENV === 'development') {
            this.microserviceBroker = new ServiceBroker({
                ...brokerConfig,
                nodeID: 'node-broker-2',
                started: async () => {
                    await modules.microservicePreStart(this.microserviceContainer);
                    await modules.microservicePostStart(this.microserviceContainer);
                },
                // created,
                created: async () => Promise.resolve(),
            });
        }
        const pubsub = await this.connectionBroker.graphqlPubsub;
        const InfraStructureFeature = new Feature({
            createContainerFunc: [
                () =>
                    infraModule({
                        broker: this.mainserviceBroker,
                        pubsub,
                        mongoClient,
                        logger: serverLogger,
                    }),
            ],
            createServiceFunc: (container) => ({ moleculerBroker: container.get(CommonType.MOLECULER_BROKER) }),
            createHemeraContainerFunc: [
                () =>
                    infraModule({
                        broker: this.mainserviceBroker,
                        pubsub,
                        mongoClient,
                        logger: serverLogger,
                    }),
            ],
        });

        const allModules = new Feature(InfraStructureFeature, modules as Feature);
        let executableSchema = await new GatewaySchemaBuilder({
            schema: allModules.schemas,
            resolvers: allModules.createResolvers({
                pubsub,
                logger: serverLogger,
                subscriptionID: `${settings.subTopic}`,
            }),
            directives: allModules.createDirectives({ logger: this.logger }),
            logger: serverLogger,
        }).build();

        executableSchema = applyMiddleware(
            executableSchema,
            // we can import rules from all modules and use lodash.merge to merge
            // them all together before passing to graphQl shield
            shield(modules.rules, {
                allowExternalErrors: true,
            }),
        );

        // set the service container
        this.serviceContainer = await allModules.createContainers({ ...settings, mongoConnection: mongoClient });
        const createServiceContext = allModules.createServiceContext({ ...settings, mongoConnection: mongoClient });
        const serviceBroker: IModuleService = {
            serviceContainer: this.serviceContainer,
            serviceContext: createServiceContext,
            dataSource: allModules.createDataSource(),
            defaultPreferences: allModules.createDefaultPreferences(),
            createContext: async (req, res) => allModules.createContext(req, res),
            logger: serverLogger,
            schema: executableSchema,
        };
        allModules.loadMainMoleculerService({
            broker: this.mainserviceBroker,
            container: this.serviceContainer,
            settings,
        });
        if (config.NODE_ENV === 'development') {
            this.microserviceContainer = await allModules.createHemeraContainers({
                ...settings,
                mongoConnection: mongoClient,
            });
            allModules.loadClientMoleculerService({
                broker: this.microserviceBroker,
                container: this.microserviceContainer,
                settings,
            });
        }

        // initialize Servers
        this.httpServer = http.createServer();
        this.app = await expressApp(serviceBroker, null, this.httpServer);

        this.httpServer.startListening = startListening.bind(this.httpServer);
        this.httpServer.on('request', this.app);
        this.httpServer.on('close', () => {
            this.httpServer = undefined;
        });

        const customWebsocket = allModules.getWebsocketConfig();
        const customWebsocketEnable = !_.isEmpty(customWebsocket);

        if (customWebsocketEnable) {
            this.multiPathWebsocket = new WebsocketMultiPathServer(serviceBroker, redisClient, customWebsocket);
            this.httpServer = this.multiPathWebsocket.httpServerUpgrade(this.httpServer);
        }
        const graphqlServer = new GraphqlServer(
            this.app,
            this.httpServer,
            redisClient,
            serviceBroker,
            !customWebsocketEnable,
        );

        await graphqlServer.initialize();
    }

    public async start() {
        if (config.NODE_ENV === 'development') {
            await Promise.all([this.mainserviceBroker.start(), this.microserviceBroker.start()]);
        } else {
            await this.mainserviceBroker.start();
        }
    }

    public async cleanup() {
        if (this.multiPathWebsocket) {
            this.multiPathWebsocket.close();
        }
        if (this.httpServer) {
            await this.httpServer.close();
        }
        if (this.connectionBroker) {
            await this.connectionBroker.stop();
        }
        if (this.mainserviceBroker) {
            await this.mainserviceBroker.stop();
        }
        if (this.microserviceBroker) {
            await this.microserviceBroker.stop();
        }
    }
}
