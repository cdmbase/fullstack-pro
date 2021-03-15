import { createBrowserHistory, createMemoryHistory, createHashHistory } from 'history';

if (__CLIENT__) {
    module.exports = createHashHistory(); // use hashistory in electron
} else {
    module.exports = (url) => createMemoryHistory({
        initialEntries: [url],
    });
}
