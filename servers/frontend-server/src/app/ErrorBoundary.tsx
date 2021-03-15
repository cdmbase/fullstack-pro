import * as React from 'react';
import { Error500 } from './500';
import { ServerError } from './ServerError';

type IErrorBoundryState = { error: any, type: string }


export class ErrorBoundary extends React.Component<any, IErrorBoundryState> {
    constructor(props) {
        super(props);
        const serverError: any = __CLIENT__ ? window.__SERVER_ERROR__ : null;
        if (serverError) {
            this.state = { error: new ServerError(serverError), type: 'serverError' };
        } else {
            this.state = { error: undefined, type: undefined };
        }
    }

    componentDidCatch(error) {
        let type = undefined;

        if (process.env.NODE_ENV === 'production') {
            type = '404'
        } else {
            type = '500'
        }
        // Update state so the next render will show the fallback UI.
        this.setState({ error, type });
    }


    render() {
        const { error, type } = this.state;
        if (error) {
            return <Error500 error={error} />
        }
        return this.props.children;
    }
}