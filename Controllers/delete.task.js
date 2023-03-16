"use strict";
const shell = require("shelljs");

module.exports = async (req, res) => {

  try {
    shell.exec(
      `sudo rm -rf ${global.dirPublic}`,
      { async: false, silent: false },
      function (data) {}
    );
    return res.json({ status: true });
  } catch (error) {
    return res.json({ status: false, msg: error.name });
  }
};
