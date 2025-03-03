"use strict";
const express = require("express");
const { isAuthenticated } = require("../controllers/main_controller");
const router = express.Router();
const session = require("express-session");

// Routes
// GET / - Home page
// The isAuthenticated middleware is used to check if the user is authenticated
router.get("/", isAuthenticated, (req, res, next) =>
  res.render("home", { title: "Home Page", userId: req.session.userId })
);

module.exports = router;
