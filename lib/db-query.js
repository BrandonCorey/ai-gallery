const { Client } = require('pg');
const dotenv = require('dotenv').config();

const CONNECTION = {
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  port: process.env.POSTGRES_PORT,
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