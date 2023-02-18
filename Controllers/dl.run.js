"use strict";
const shell = require("shelljs");

module.exports = async (req, res) => {
  const { slug } = req.query;

  try {
    if (!slug) return res.json({ status: false, msg: "not_slug" });

    shell.exec(
      `curl --write-out '%{http_code} start ${slug} done' --silent --output /dev/null "http://127.0.0.1/start?slug=${slug}" &&
      sleep 2 &&
      curl --write-out '%{http_code} download ${slug} done' --silent --output /dev/null "http://127.0.0.1/download?slug=${slug}" &&
      sleep 2 &&
      curl --write-out '%{http_code} remote ${slug} done' --silent --output /dev/null "http://127.0.0.1/remote?slug=${slug}"
      `,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({ status: true });
  } catch (error) {
    return res.json({ status: false, msg: error.name });
  }
};
