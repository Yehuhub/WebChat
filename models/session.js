// Used to create a session middleware and store it in the database
"use strict";
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const sequelize = require("./index");

const SESSIONTIME = 10 * 60 * 1000;

const sessionStore = new SequelizeStore({
  db: sequelize,
  checkExpirationInterval: SESSIONTIME,
});

sessionStore.sync();

const sessionMiddleware = session({
  secret: "my-secret-key",
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: SESSIONTIME },
});

module.exports = { sessionMiddleware, sessionStore };
