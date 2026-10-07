const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, "a tour name can't have more than 40 leteers"],
      minLength: [3, "a tour name can't have less than 3 letters"],
      validate: [validator.isAlpha, 'a tour name must be char'],
    },
    slug: {
      type: String,
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
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'invalid difficulty',
      },
    },
    ratingAvg: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be higher than one'],
      max: [5, 'Rating should be 5 or less'],
    },
    ratingQuantity: { type: Number, default: 0 },

    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'the discont ({VALUE}) must be less than the main price',
      },
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
      default: Date.now,
      select: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
      select: false,
    },
  },

  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// document middelware:runs before .save() and create()
// tourSchema.post('save', function () {
//   if (this.name) {
//     this.slug = slugify(this.name, { lower: true });
//   }
// });

// query middelware
tourSchema.pre(/^find/, function () {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
});
tourSchema.post(/^find/, function (docs) {
  console.log(`query took ${Date.now() - this.start}ms`);
  // console.log(docs);
});

// aggregation middelware
tourSchema.pre('aggregate', function () {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  // console.log(this.pipeline());
});

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
