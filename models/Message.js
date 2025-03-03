"use strict";
const sequelize = require("./index");
const { DataTypes } = require("sequelize");
const sanitizeHtml = require("sanitize-html");

// Define the Message model
// The model is used to interact with the messages table in the database
const Message = sequelize.define(
  "Message",
  {
    content: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1 - 100], //randomly picked 100
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    modelName: "Message",
    paranoid: "true",
  }
);

Message.beforeSave((message) => {
  message.content = sanitizeHtml(message.content, {
    allowedTags: [],
    allowedAttributes: {},
  });
});

module.exports = Message;
