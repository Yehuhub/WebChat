"use strict";
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const sequelize = require("./models/index");
const { sessionMiddleware } = require("./models/session");

// Routes
const indexRouter = require("./routes/index");
const registrationRouter = require("./routes/registration");
const loginRouter = require("./routes/login");
const apiRouter = require("./routes/api");
const mainRouter = require("./routes/main");
const signoutRouter = require("./routes/signout");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    await sequelize.sync();
    console.log("All models were synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

// Enable sessions
app.use(sessionMiddleware);

// Routing
app.use("/", indexRouter);
app.use("/registration", registrationRouter);
app.use("/login", loginRouter);
app.use("/api", apiRouter);
app.use("/home", mainRouter);
app.use("/signout", signoutRouter);
app.use("/error", (req, res, next) => next(new Error("Unexpected Error")));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
