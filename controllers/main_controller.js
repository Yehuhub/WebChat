"use strict";

/**
 * Middleware to check if the user is authenticated
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
exports.isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    res.redirect("/login");
  }
  next();
};
