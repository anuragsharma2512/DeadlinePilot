const { createClient } = require('@libsql/client');
require('dotenv').config();
const { getDatabaseConfig } = require('./config');

const { url, authToken } = getDatabaseConfig();

const client = createClient({ url, authToken });

module.exports = client;
