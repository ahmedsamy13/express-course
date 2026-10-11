const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
//
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

//

app.use(express.json());

//// middelwares
app.use(morgan('dev'));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `${req.originalUrl} does not exist`,
  // });
  // const err = new Error(`${req.originalUrl} does not exist`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`${req.originalUrl} does not exist`), 404);
});

app.use();
//server
module.exports = app;
