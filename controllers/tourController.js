const Tour = require('../models/tourModel');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = async (req, res) => {
  try {
    // const tours = await Tour.find({
    //   duration: 5,
    //   difficulty: 'easy',
    // });
    // const tours = await Tour.find()
    //   .where('duration')
    //   .equals(5)
    //   .where('difficulty')
    //   .equals('easy');
    // --------------------------------------filter-------------------------------
    //-----------{{api}}/tours?difficulty=easy&duration=5
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    //------------------------------------advanced filter-----------------------------
    //-----------{{api}}/tours?price[gte]=500&ratingsAverage[gte]=4.5
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    //
    let query = Tour.find(JSON.parse(queryStr));

    //---------------------------sorting--------------------------
    //-----------------{{api}}/tours?sort=-price

    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    //-------------------------------limiting---------------------
    //-----------{{api}}/tours?fields=name,duration(- for exclude)
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }
    //----------------------------------pagination---------------------
    //-----------{{api}}/tours?page=2,limit=10
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 1;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numbersOfTours = await Tour.countDocuments();
      if (skip >= numbersOfTours) throw new Error('This page does not exist');
    }
    //------------------------------excute the query-----------------------
    const tours = await query;

    res.status(200).json({
      status: 'success',
      message: 'tours fetched',
      data: { tours },
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'tour fetched',
      data: { tour },
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err });
  }
};

exports.createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);
    res.status(201).json({
      status: 'success',
      message: 'tour created',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'updated tour',
      data: { tour },
    });
  } catch (err) {
    res.status(200).json({
      status: 'fail',
      message: "couldn't updated tour",
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      stauts: 'success',
      message: 'deleted tour',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      stauts: 'fail',
      message: `coudnt deleted tour ${err}`,
    });
  }
};
