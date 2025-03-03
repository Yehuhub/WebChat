"use strict";
const sequelize = require("./index");
const { DataTypes } = require("sequelize");
const Message = require("./Message");
const bcrypt = require("bcrypt");

const saltRounds = 10; //required for hashing the password

// Define the User model
// The model is used to interact with the users table in the database
const User = sequelize.define(
  "User",
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: "Email address already exists, please choose a different one",
      },
      validate: {
        isEmail: {
          msg: "Email address is invalid",
        },
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isAlpha: {
          msg: "Please use a valid name(letters A-Za-z)",
        },
        len: { args: [3, 32], msg: "Name too long/short(length 3-32)" },
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isAlpha: {
          msg: "Please use a valid name(letters A-Za-z)",
        },
        len: { args: [3, 32], msg: "Last name too long/short(length 3-32)" },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { args: [3, 32], msg: "Password too long/short(length 3-32)" },
      },
    },
  },
  {
    modelName: "User",
  }
);

User.beforeSave(async (user) => {
  user.email = user.email.toLowerCase();
  try {
    user.password = await bcrypt.hash(user.password, saltRounds);
  } catch (error) {
    throw new Error("Failed to hash password, please try again");
  }
});

User.hasMany(Message, { foreignKey: "userId", as: "messages" });
Message.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = User;
