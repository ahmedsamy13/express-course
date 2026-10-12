const { default: mongoose } = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'your name is required'],
    trim: true,
    minLength: [2, 'your name must be at least 3 char'],
    maxLength: [15, 'name must contain less than 16 char'],
    validate: {
      validator: validator.isAlpha,
      message: 'a tour name must only contain characters',
    },
  },
  email: {
    type: String,
    required: [true, 'email is required'],
    unique: [true, 'this email exists, please enter another enail'],
    lowerCase: true,
    validate: {
      validator: validator.isEmail,
      message: 'please enter a correct email',
    },
  },
  photo: {
    type: String,
  },
  password: {
    type: String,
    required: [true, 'password is required'],
    minLength: [5, 'your password must be at least 3 char'],
    maxLength: [25, 'name password contain less than 26 char'],
  },
  confirmPassword: {
    type: String,
    required: [true, 'please confirm your password'],
    validate: {
      // this only works on CREATE and SAVE!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
});

const User = mongoose.model('User', userSchema);
module.exports = User;
