"use strict";
const express = require("express");
const router = express.Router();
const {
  registerPassword,
  validateFields,
  setRegistrationCookies,
  getRegistrationCookies,
  displayRegistration,
} = require("../controllers/registration_controller");

// Routes
// GET / - Registration page
router.get("/", getRegistrationCookies, displayRegistration);

// POST / - Validate registration fields
router.post("/", validateFields, setRegistrationCookies, (req, res, next) => {
  res.render("register_pswd", {
    title: "Register",
    errorMessage: "",
    fields: {},
  });
});

// GET /pswd - Redirect to login page
router.post("/pswd", getRegistrationCookies, registerPassword, (req, res) => {
  res.render("login", {
    title: "Sign in",
    successMessage: "You are now registered!",
    errorMessage: "",
  });
});

// GET /pswd - Redirect to login page
router.get("/pswd", (req, res) => res.redirect("/login"));

module.exports = router;
