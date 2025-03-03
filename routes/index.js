"use strict";
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../controllers/login_controller");

/* GET home page. */
router.get("/", isAuthenticated);

module.exports = router;
