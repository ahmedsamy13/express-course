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

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);
//

//routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
//server
module.exports = app;
