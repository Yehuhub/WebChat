"use strict";
const User = require("../models/User");
const bcrypt = require("bcrypt");

/**
 * Middleware to validate the email of the user in the database
 * @param {Request} req - Request object with email in the body
 * @param {Response} res - Response object
 * @param {Function} next - Next function
 */
exports.validateEmail = async (req, res, next) => {
  const email = req.body.email.trim();

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Email is not registered");
    }
    req.user = user;
    next();
  } catch (err) {
    renderLoginError(err, req, res, next);
  }
};

/**
 * Middleware to validate the password of the user in the database
 * @param {Request} req - Request object with password in the body
 * @param {Response} res - Response object
 * @param {Function} next - Next function
 */
exports.validatePassword = async (req, res, next) => {
  const password = req.body.password.trim();

  try {
    const isPasswordCorrect = await bcrypt.compare(password, req.user.password);
    if (!isPasswordCorrect) {
      throw new Error("Wrong password!");
    }
    next();
  } catch (err) {
    renderLoginError(err, req, res);
  }
};

/**
 * Middleware to initialize the session
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 * @param {Function} next - Next function
 */
exports.initSession = (req, res, next) => {
  req.session.userId = req.user.id;
  req.session.userEmail = req.user.email;

  next();
};

/**
 * Middleware to check if the user is authenticated and redirect accordingly
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 * @param {Function} next - Next function
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    res.redirect("/home");
  } else {
    res.redirect("/login");
  }
};

/**
 * error handler for login errors
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 * @param {Function} next - Next function
 */
const renderLoginError = (err, req, res, next) => {
  if (err instanceof Error && err.message) {
    res.render("login", {
      title: "Sign in",
      successMessage: "",
      errorMessage: err.message,
    });
  } else {
    next(err, req, res, next);
  }
};
