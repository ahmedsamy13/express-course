const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const errorController = require('./controllers/errorController');
//
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

//

app.use(express.json());

//// middelwares
app.use(morgan('dev'));

app.use((req, res, next) => {
  console.log(req.headers);

  req.requestTime = new Date().toISOString();
  next();
});

//routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`${req.originalUrl} does not exist`, 404));
});

app.use(errorController);
//server
module.exports = app;
