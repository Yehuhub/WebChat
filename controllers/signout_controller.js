"use strict";
const { sessionStore } = require("../models/session");
const { Op } = require("sequelize");

/**
 * Sign out the user by deleting the session from the database.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
exports.signOut = async (req, res, next) => {
  const userId = req.session.userId;
  try {
    const deletedCount = await sessionStore.sessionModel.destroy({
      where: {
        data: {
          [Op.like]: `%"userId":${userId}%`,
        },
      },
    });
    next();
  } catch (err) {
    next(err, req, res, next);
  }
};
