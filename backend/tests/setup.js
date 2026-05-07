const { initDB } = require('../database');

// Initialise the DB connection pool once before all test suites
beforeAll(async () => {
  await initDB();
}, 30000);
