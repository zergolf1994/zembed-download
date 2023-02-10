"use strict";

const fs = require("fs-extra");
const path = require("path");
const shell = require("shelljs");

module.exports = async (e) => {
  let cacheDir = path.join(global.dir, ".cache", slug),
    cacheFile = path.join(cacheDir, `server_ip`);
  try {
    if (!fs.existsSync(cacheFile)) {
      await fs.ensureDir(cacheDir);
      shell.exec(
        `#!/usr/bin/env bash
      set -e
      localip=$(hostname -I | awk '{print $1}')
      printf "$localip\n"> ${cacheFile}`,
        { async: true, silent: true },
        function (data) {}
      );
    }

    let sv_ip = await fs
      .readFileSync(`${cache_dir}/server_ip.txt`, "utf8")
      .trim();
    return sv_ip;
  } catch (error) {
    console.error(error);
    return;
  }
};
