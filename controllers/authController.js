const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });
  const token = signToken(newUser._id);
  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = await req.body;
  // 1) if email and user exits
  if (!email || !password) {
    return next(new AppError('please provide email and password', 400));
  }
  // 2) check if the user exist and passwor is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorect email or password', 401));
  }
  // 3) if everything is ok => send the token to the client
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    message: 'logged in',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting token anc check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new AppError('You are not loged in, please log in to get access', 401),
    );
  }
  // 2) verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user is still exist
  const freshUser = await User.findById(decoded.id);
  if (!freshUser)
    return next(new AppError('the user is no longer exist.', 401));

  // 4) check if the user changed passwor after the token was issued
  if (freshUser.changePasswordAfter(decoded.iat))
    return next(
      new AppError('user recently changed password , please log in again', 401),
    );
  req.user = freshUser;
  next();
});
