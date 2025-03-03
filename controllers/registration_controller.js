"use strict";
const User = require("../models/User");
const Cookies = require("cookies");
const { Sequelize } = require("sequelize");

const keys = ["keyboard cat"];
const REGISTER = 10; // for adjusting cookie age

/**
 * Middleware to validate the registration fields
 * @param {Request} req should contain the email, firstName, lastName fields in the body
 * @param {Response} res
 * @param {Function} next
 */
exports.validateFields = async (req, res, next) => {
  const email = req.body.email.trim();
  const firstName = req.body.firstName.trim();
  const lastName = req.body.lastName.trim();

  try {
    const newUser = User.build({
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: "temp",
    });
    await newUser.validate();
    const existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      throw new Error("Email already registered");
    }
  } catch (err) {
    console.error(err, err.name, err.status);
    return displayRegistrationErr(
      { email, firstName, lastName },
      err,
      req,
      res,
      next
    );
  }
  // we will not reach here if there is any error
  // re insert the trimmed input
  req.body.email = email;
  req.body.firstName = firstName;
  req.body.lastName = lastName;

  next();
};

/**
 * Middleware to set the registration cookies
 * @param {Request} req should contain the email, firstName, lastName fields in the body
 * @param {Response} res
 * @param {Function} next
 */
exports.setRegistrationCookies = (req, res, next) => {
  const cookies = new Cookies(req, res, { keys: keys });
  const maxAge = REGISTER * 1000;

  cookies.set("email", req.body.email, { maxAge: maxAge });
  cookies.set("firstName", req.body.firstName, { maxAge: maxAge });
  cookies.set("lastName", req.body.lastName, { maxAge: maxAge });

  next();
};

/**
 * Middleware to get the registration cookies
 * @param {Request} req  should contain the cookies
 * @param {Response} res
 * @param {Function} next
 */
exports.getRegistrationCookies = (req, res, next) => {
  const cookies = new Cookies(req, res, { keys: keys });

  const email = cookies.get("email");
  const firstName = cookies.get("firstName");
  const lastName = cookies.get("lastName");

  req.registrationData = {
    email: email,
    firstName: firstName,
    lastName: lastName,
  };
  next();
};

/**
 * Middleware to register the password
 * @param {Request} req should contain the password and vPassword fields in the body
 * @param {Response} res
 * @param {Function} next
 */
exports.registerPassword = async (req, res, next) => {
  const password = req.body.password.trim();
  const vPassword = req.body.vPassword.trim();

  if (password !== vPassword) {
    const err = new Error("Passwords dont match!");
    return displayPasswordRegistrationErr(password, vPassword, err, req, res);
  }

  try {
    if (!req.registrationData || !req.registrationData.email) {
      throw new Error("Registration timed out!");
    }
    await User.create({
      email: req.registrationData.email,
      firstName: req.registrationData.firstName,
      lastName: req.registrationData.lastName,
      password: password,
    });
  } catch (err) {
    if (err instanceof Sequelize.ValidationError) {
      const validationErrors = err.errors;
      const passwordError = validationErrors.find(
        (error) => error.path === "password"
      );
      if (passwordError) {
        return displayPasswordRegistrationErr(
          password,
          vPassword,
          passwordError,
          req,
          res,
          next
        );
      }
    } else {
      next(err, req, res, next);
    }
  }

  next();
};

/**
 * Middleware to display the registration page
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
exports.displayRegistration = (req, res, next) => {
  res.render("register", {
    title: "Register",
    errorMessage: "",
    fields: req.registrationData,
  });
};

/**
 * Middleware to display the registration password page
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
const displayRegistrationErr = (prevFields, err, req, res, next) => {
  if (
    err.name === "SequelizeValidationError" ||
    err.message === "Email already registered"
  ) {
    console.log(err.name);
    return res.render("register", {
      title: "Register",
      errorMessage: err ? err.message : null,
      fields: prevFields,
    });
  }

  next(err, req, res, next);
};

/**
 * Middleware to display the registration password error page
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
const displayPasswordRegistrationErr = (password, vPassword, err, req, res) => {
  return res.render("register_pswd", {
    title: "Register",
    errorMessage: err ? err.message : null,
    fields: { password, vPassword },
  });
};
