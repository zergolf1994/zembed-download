"use strict";
const { Task } = require(`../Utils`);

module.exports = async (req, res) => {
  try {
    let task = await Task();
    return res.json(task);
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
