require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

async function init() {
  const url = process.env.DATABASE_URL || 'file:lifesaver.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  
  console.log(`Connecting to database at ${url}...`);
  const client = createClient({ url, authToken });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema.sql...');
    await client.executeMultiple(schemaSql);
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (client && typeof client.close === 'function') {
      client.close();
    }
  }
}

init();
