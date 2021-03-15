
class ServerError extends Error {
    constructor(error: any) {
        super();
        for (const key of Object.getOwnPropertyNames(error)) {
            this[key] = error[key];
        }
        this.name = 'ServerError';
    }
}

export { ServerError };