"use strict";
const express = require("express");
const {
  validateEmail,
  validatePassword,
  initSession,
} = require("../controllers/login_controller");
const router = express.Router();

// Routes
// GET / - Login page
router.get("/", (req, res, next) => {
  res.render("login", {
    title: "Sign in",
    errorMessage: "",
    successMessage: "",
  });
});

// POST /validate-user - Validate user credentials
router.post(
  "/validate-user",
  validateEmail,
  validatePassword,
  initSession,
  (req, res, next) => {
    res.redirect("/home");
  }
);

module.exports = router;
