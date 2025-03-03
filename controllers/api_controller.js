"use strict";
const User = require("../models/User");
const Message = require("../models/Message");
const { Op } = require("sequelize");
const sequelize = require("../models/index");

/**
 * middleware to check if the user is authenticated
 * @param {Object} req - Request object (expects `session` and `session.userId`).
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 */
exports.authMiddleware = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized request" });
  }
};

/**
 * middleware to write a message to the database
 *
 * @param {Object} req - Request object (expects `body.messageContent` and `session.userId`).
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 * @returns {Object} - 200 response on success or an error passed to `next()`.
 */
exports.writeMessage = async (req, res, next) => {
  const id = req.session.userId;
  const message = req.body.messageContent?.trim();
  try {
    const newMessage = Message.build({
      content: message,
      userId: id,
    });
    await newMessage.validate();
    await newMessage.save();

    return sendResponse(res, 200, "Message sent successfully", newMessage);
  } catch (err) {
    next({
      status: 400,
      message: "Can not send message",
      details: err.message,
    });
  }
};

/**
 * Updates a message in the database if the user owns it.
 *
 * @param {Object} req - Request object (expects `body.messageId`, `body.messageContent` and `session.userId`).
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 * @returns {Object} - 200 response on success or an error passed to `next()`.
 */
exports.updateMessage = async (req, res, next) => {
  const { messageId, messageContent } = req.body;
  const userId = req.session.userId;
  console.log(messageId, messageContent);
  try {
    const messageToEdit = await validateMessageOwnership(messageId, userId);
    messageToEdit.content = messageContent.trim();
    await messageToEdit.save();
    return sendResponse(
      res,
      200,
      "Message updated successfully",
      messageToEdit
    );
  } catch (err) {
    next({
      status: err.status,
      message: err.message,
      details: err.details,
    });
  }
};

/**
 * Deletes a message from the database if the user owns it.
 *
 * @param {Object} req - Request object (expects `params.messageId` and `session.userId`).
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 * @returns {Object} - 200 response on success or an error passed to `next()`.
 */
exports.deleteMessage = async (req, res, next) => {
  const messageId = req.params.messageId;
  const userId = req.session.userId;
  try {
    const messageToEdit = await validateMessageOwnership(messageId, userId);
    await messageToEdit.destroy();
    return sendResponse(res, 200, "Message deleted successfully");
  } catch (err) {
    console.error(err); //for debugging
    next({
      status: err.status,
      message: err.message,
      details: err.details,
    });
  }
};

/**
 * Retrieves messages from the database since a given date.
 * The messages are sorted by `updatedAt` in ascending order.
 * The response includes the user's `firstName` and `lastName`.
 * The response includes a `status` field to indicate if the message is new, updated, or deleted.
 * @param {Object} req - Request object (expects `query.lastFetchTimeStamp`). The timestamp should be in ISO format.
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 * @returns {Object} - 200 response on success or an error passed to `next()`.
 */
exports.getMessagesByDate = async (req, res, next) => {
  const { lastFetchTimeStamp } = req.query;
  const lastFetchDate = new Date(lastFetchTimeStamp);
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            createdAt: { [Op.gt]: lastFetchDate },
          },
          {
            updatedAt: { [Op.gt]: lastFetchDate },
            createdAt: { [Op.ne]: sequelize.col("Message.updatedAt") }, // Corrected syntax
          },
        ],
      },
      paranoid: false, // Include soft-deleted records
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName"], // Only fetch firstName and lastName of the user
        },
      ],
    });

    const processedMessages = messages.map((message) => {
      const status = message.deletedAt
        ? "deleted"
        : message.createdAt > lastFetchDate
        ? "new"
        : "updated";

      return {
        ...message.dataValues,
        status: status,
        // Add deletedAt for deleted messages if needed
        ...(message.deletedAt && { deletedAt: message.deletedAt }),
      };
    });

    return sendResponse(res, 200, "Messages retrieved", {
      messages: processedMessages,
    });
  } catch (err) {
    next({
      status: 400,
      message: "Can not retrieve messages",
      details: err.details,
    });
  }
};

/**
 * Retrieves all messages from the database.
 * The messages are sorted by `updatedAt` in ascending order.
 * The response includes the user's `firstName` and `lastName`.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 * @returns {Object} - 200 response on success or an error passed to `next()`.
 */
exports.getAllMessages = async (req, res, next) => {
  try {
    const messages = await Message.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName"], // only get firstName and lastName of the user
        },
      ],
      order: [["updatedAt", "ASC"]],
    });
    return sendResponse(res, 200, "Messages retrieved", { messages });
  } catch (err) {
    next({
      status: 400,
      message: "Can not retrieve messages",
      details: err.details,
    });
  }
};

/**
 * Searches for messages containing a given string.
 * The response includes the user's `firstName` and `lastName`.
 * @param {Object} req - Request object (expects `query.string`).
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 * @returns {Object} - 200 response on success or an error passed to `next()`.
 */
exports.searchMessages = async (req, res, next) => {
  const { string } = req.query;

  try {
    const messagesFound = await Message.findAll({
      where: {
        content: {
          [Op.like]: `%${string}%`,
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName"], // Only fetch firstName and lastName of the user
        },
      ],
    });
    return sendResponse(
      res,
      200,
      messagesFound.size > 0 ? "Messages Found" : "No messages Found",
      { messages: messagesFound }
    );
  } catch (err) {
    next({
      status: 400,
      message: "No messages found",
      details: err.details,
    });
  }
};

//-------------------helper functions-------------------

/**
 * Sends a response with a status code, message, and data.
 * @param {Object} res - Response object.
 * @param {number} status - Status code.
 * @param {string} message - Message to send.
 * @param {Object} data - Data to send.
 * @returns {Object} - Response object.
 */
const sendResponse = (res, status = 200, message, data = null) => {
  return res.status(status).json({ message, data });
};

/**
 * Error handling middleware.
 * @param {Object} err - Error object.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 * @returns {Object} - Error response.
 */
exports.errorHandler = (err, req, res, next) => {
  if (err.status >= 500) {
    next(err, req, res);
  } else {
    res.status(err.status).json({
      message: err.message,
      details: err.details,
    });
  }
};

/**
 * Validates if the user owns the message.
 * @param {number} messageId - Message ID.
 * @param {number} userId - User ID.
 * @returns {Object} - Message object.
 * @throws {Object} - Error object.
 */
const validateMessageOwnership = async (messageId, userId) => {
  const messageToEdit = await Message.findOne({ where: { id: messageId } });
  if (!messageToEdit) {
    throw {
      status: 404,
      message: "Can not find the requested message to edit/delete",
    };
  }
  if (messageToEdit.userId !== userId) {
    throw { status: 403, message: "The user is not the owner of the message" };
  }
  return messageToEdit;
};
