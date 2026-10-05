const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
  },
  duration: {
    type: Number,
    required: [true, 'A tour duration is required'],
  },
  maxGroupSize: {
    type: Number,
    required: [true, 'A tour must have a max size'],
  },
  difficulty: {
    type: String,
    required: [true, 'A tour must have a difficulty'],
  },
  ratingAvg: { type: Number, default: 4.5 },
  ratingQuantity: { type: Number, default: 0 },

  price: { type: Number, required: [true, 'A tour must have a price'] },
  priceDiscount: {
    type: Number,
  },
  summary: {
    type: String,
    trim: true,
  },
  discription: {
    type: String,
    trim: true,
    required: [true, 'A tour must have a discription'],
  },
  imgCover: {
    type: String,
    required: [true, 'A tour must have a cover image'],
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false,
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
    select: false,
  },
  startDates: [Date],
});
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
