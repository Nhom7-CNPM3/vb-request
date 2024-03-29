const YAML = require('js-yaml');
const fs = require('fs');
const fsp = require('fs/promises');

const configName = 'vbrequest.yml';
const encodingConfig = 'utf8';

// Generate file 'vbrequest.yml' if not exists
const defaultConfig = `
# VBRequest Configuration File
# This file is used to configure the VBRequest module
# With token when fetching data you can use %token% to replace it if needed
groups:
    servers1:
        server-choosing: 1
        servers:
            1:
                url: 'http://localhost:3000'
                token: 'token'
            2:
                url: 'http://localhost:3001'
                token: 'token'
    servers2:
        server-choosing: 1
        servers:
            1:
                url: 'http://localhost:3000'
                token: 'token'
            2:
                url: 'http://localhost:3001'
                token: 'token'
`;

if (!fs.existsSync(configName)) fs.writeFileSync(configName, defaultConfig);

const readConfig = () =>
{
    return fsp.readFile(configName, encodingConfig);
}

const writeConfig = (data) =>
{
    return fsp.writeFile(configName, data, encodingConfig);
}

const parseConfig = async () =>
{
    return YAML.load(await readConfig());
}

const setNestedValue = async (path, value) =>
{
    try {
        let config = await parseConfig();
        let keys = path.split('.');
        let lastKey = keys.pop();
        let lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, config);

        lastObj[lastKey] = value;
        await writeConfig(YAML.dump(config));
    } catch (err) {
        console.error('VBError: ' + err);
        return;
    }
}

const getNextServer = async (group) =>
{
    try {
        let nested = `groups.${group}.server-choosing`;
        let config = await parseConfig();
        let servers = config.groups[group].servers;
        let serverChoosing = config.groups[group]['server-choosing'];

        // If the server choosing is greater than the number of servers, reset it to 1
        if (serverChoosing >= Object.keys(servers).length) {
            await setNestedValue(nested, 1);
        } else {
            // Increment the server choosing
            await setNestedValue(nested, serverChoosing + 1);
        }

        let nextServer = servers[serverChoosing];
    
        return nextServer;
    } catch (err) {
        console.error('VBError: ' + err);
        return null;
    }
}

const replaceToken = (headers, token) => 
{
    for (let key in headers) headers[key] = headers[key].toString().replace('%token%', token);
}

const doFetch = async (group, method, path, init = null) =>
{
    let server = await getNextServer(group);
    
    if (server == null) return { 
        error: 'Server not found' 
    };

    let url = server.url + path;
    let token = server.token;

    let defaultInit = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (init == null) init = defaultInit;

    try {
        // Call the server
        let response = await fetch(url, replaceToken(init, token));

        return response;
    } catch (err) {
        console.error('VBError: ' + err);
        return {
            error: err
        };
    }
}

const get = async (group, path, init = null) =>
{
    return doFetch(group, 'GET', path, init);
}

const post = async (group, path, init = null) =>
{
    return doFetch(group, 'POST', path, init);
}

const put = async (group, path, init = null) =>
{
    return doFetch(group, 'PUT', path, init);
}

const patch = async (group, path, init = null) =>
{
    return doFetch(group, 'PATCH', path, init);
}

const del = async (group, path, init = null) =>
{
    return doFetch(group, 'DELETE', path, init);
}

const head = async (group, path, init = null) =>
{
    return doFetch(group, 'HEAD', path, init);
}

const options = async (group, path, init = null) =>
{
    return doFetch(group, 'OPTIONS', path, init);
}

const trace = async (group, path, init = null) =>
{
    return doFetch(group, 'TRACE', path, init);
}

const connect = async (group, path, init = null) =>
{
    return doFetch(group, 'CONNECT', path, init);
}

module.exports = {
    readConfig,
    writeConfig,
    setNestedValue,
    getNextServer,
    replaceToken,
    doFetch,
    get,
    post,
    put,
    patch,
    del,
    head,
    options,
    trace,
    connect
}