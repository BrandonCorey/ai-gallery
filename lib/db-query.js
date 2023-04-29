const { Client } = require('pg');

// const isProduction = (config.NODE_ENV === 'production');
const CONNECTION = {
  host: '/var/run/postgresql',
  database: 'ai-gallery',
  user: 'nug',
  port: 5432,
};

const logQuery = (statement, params) => {
  let timestamp = new Date();
  let formattedTimestamp = timestamp.toString().slice(4,24);
  console.log(formattedTimestamp, statement, params);
};

const dbQuery = async (statement, ...params) => {
  let client = new Client(CONNECTION);

  await client.connect();
  logQuery(statement, params);
  let result = await client.query(statement, params);
  await client.end();

  return result;
};

module.exports = dbQuery;