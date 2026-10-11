const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env', override: false });

const app = require('./app');

let server;

mongoose
  .connect(process.env.DATABASE, {})
  .then(() => {
    console.log('DB connection successful!');
    const port = process.env.PORT || 3000;
    server = app.listen(port, () => {
      console.log(`app running on ${port}`);
    });
  })
  .catch((err) => {
    console.error('DB connection error:', err);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection. Shutting down the app.');
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('Uncaught exception. Shutting down the app.');
  process.exit(1);
});
