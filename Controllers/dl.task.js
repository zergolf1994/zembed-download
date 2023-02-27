"use strict";
const path = require("path");
const fs = require("fs-extra");
const { Task } = require(`../Utils`);

module.exports = async (req, res) => {
  try {
    
    let file_task = path.join(global.dirPublic, "task.json");
    if (!fs.existsSync(file_task)) {
      return res.json({ status: "false", msg: "no_file_task" });
    }

    let task = await Task();
    return res.json(task);
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
