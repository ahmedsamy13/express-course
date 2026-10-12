const { default: mongoose } = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

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

userSchema.pre('save', async function () {
  // Only run this function if password was modified
  if (!this.isModified('password')) return;

  // Hash password with cost 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete confirm pass field so it is not persisted in the database
  this.confirmPassword = undefined;
});

const User = mongoose.model('User', userSchema);
module.exports = User;
