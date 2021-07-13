import { ServiceBroker, Middleware } from 'moleculer';
import * as _ from 'lodash';
import { logger } from '@cdm-logger/server';

export const InterNamespaceMiddleware = function (options): Middleware {
    if (!Array.isArray(options)) {
        throw new Error('Must be an Array');
    }

    let thisBroker: ServiceBroker;
    const brokers: { [key: string]: ServiceBroker } = {};

    return {
        created(broker: ServiceBroker) {
            thisBroker = broker;
            options.forEach((nsOpts) => {
                if (_.isString(nsOpts)) {
                    nsOpts = {
                        namespace: nsOpts,
                    };
                }
                const ns = nsOpts.namespace;

                const brokerOpts = _.defaultsDeep(
                    {},
                    nsOpts,
                    { nodeID: null, middlewares: null, created: null, started: null },
                    broker.options,
                );
                brokers[ns] = new ServiceBroker(brokerOpts);
            });
        },

        started() {
            return Promise.all(Object.values(brokers).map((b) => b.start()));
        },

        stopped() {
            return Promise.all(Object.values(brokers).map((b) => b.stop()));
        },

        call(next) {
            return function (actionName, params, opts = {}) {
                if (_.isString(actionName) && actionName.includes('@')) {
                    const [action, namespace] = actionName.split('@');

                    if (brokers[namespace]) {
                        return brokers[namespace].call(action, params, opts);
                    }
                    if (namespace === thisBroker.namespace) {
                        return next(action, params, opts);
                    }
                    throw new Error(`Unknown namespace: ${namespace}`);
                }

                return next(actionName, params, opts);
            };
        },
    };
};
