const express = require('express');
const morgan = require('morgan');
//
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

//

app.use(express.json());

//// middelwares
app.use(morgan('dev'));
app.use((req, res, next) => {
  console.log('hello from the middelware');
  next();
});
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
//server
module.exports = app;
