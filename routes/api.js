"use strict";
const express = require("express");
const {
  authMiddleware,
  writeMessage,
  updateMessage,
  deleteMessage,
  errorHandler,
  getMessagesByDate,
  getAllMessages,
  searchMessages,
} = require("../controllers/api_controller");
const router = express.Router();

// Middleware to check if the user is authenticated
router.use(authMiddleware);

// Routes
// GET /api/message - Get all messages
router.get("/message", getAllMessages);

// GET /api/message/date - Get all messages by date
router.get("/message/date", getMessagesByDate);

// GET /api/message/search - Search messages
router.get("/message/search", searchMessages);

// POST /api/message - Write a message
router.post("/message", writeMessage);

// PUT /api/message - Update a message
router.put("/message", updateMessage);

// DELETE /api/message/:messageId - Delete a message
router.delete("/message/:messageId", deleteMessage);

// Error handler
router.use(errorHandler);

module.exports = router;
