const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.DATABASE_URL || 'file:lifesaver.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

module.exports = client;
