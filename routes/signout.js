"use strict";
const express = require("express");
const { signOut } = require("../controllers/signout_controller");
const router = express.Router();

// Routes
// POST / - Sign out
router.post("/", signOut, (req, res) => {
  res.redirect("/");
});

module.exports = router;
