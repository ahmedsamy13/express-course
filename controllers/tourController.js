const Tour = require('../models/tourModel');

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
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    const query = Tour.find(queryObj);
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
