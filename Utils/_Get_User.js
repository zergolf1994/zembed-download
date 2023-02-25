"use strict";
const request = require("request");
const queryString = require("query-string");
const { Users } = require(`../Models`);
const { Sequelize, Op } = require("sequelize");

exports.Sets = async ({ userId }) => {
  try {
    return new Promise(async function (resolve, reject) {
      if (userId == undefined) reject(`not_userId`);
      let rows = await Users.Sets.findAll({ raw: true, where: { userId } });
      let data = {};
      for (let key in rows) {
        if (rows.hasOwnProperty(key)) {
          if (rows[key]?.name != "") {
            data[rows[key]?.name] = rows[key]?.value;
          }
        }
      }
      resolve(data);
    });
  } catch (error) {
    console.error(error);
    return;
  }
};
