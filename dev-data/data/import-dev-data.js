const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');

// 1. Read environment variables from config.env (which is 2 levels up in the root folder)
dotenv.config({ path: `${__dirname}/../../config.env` });

// 2. Connect to the database
mongoose
  .connect(process.env.DATABASE, {})
  .then(() => console.log('DB connection successful!'))
  .catch((err) => console.log('DB connection error:', err));

// 3. Read JSON file
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8')
);

// Map the keys from the JSON to match the exact spelling in your tourModel.js schema 
// (e.g. description -> discription, imageCover -> imgCover, etc.)
// We also filter out any invalid mock data at the end of the JSON that is missing required fields.
const validTours = tours
  .filter((tour) => tour.name && tour.duration && tour.difficulty && tour.price)
  .map((tour) => {
    return {
      ...tour,
      ratingAvg: tour.ratingsAverage,
      ratingQuantity: tour.ratingsQuantity,
      discription: tour.description,
      imgCover: tour.imageCover,
    };
  });

// 4. Import data into DB function
const importData = async () => {
  try {
    await Tour.create(validTours);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit(); // Exit process when done
};

// 5. Delete all data from DB function
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit(); // Exit process when done
};

// 6. Check console arguments to run the correct function
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
} else {
  console.log('Please pass --import or --delete as an argument');
  process.exit();
}
