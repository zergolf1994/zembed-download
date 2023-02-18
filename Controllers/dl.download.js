"use strict";

const fs = require("fs-extra");
const shell = require("shelljs");

const { Files, Servers, Process } = require(`../Models`);
const { Google } = require(`../Utils`);

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;
    let outputPath, storageId;

    if (!slug) return res.json({ status: false });

    let row = await Files.Lists.findOne({
      where: {
        slug,
      },
    });

    if (!row) return res.json({ status: false, msg: "not_exists" });

    let pc = await Process.findOne({
      raw: true,
      where: {
        fileId: row?.id,
        type: "download",
      },
    });

    if (!pc) return res.json({ status: false, msg: "not_exists" });

    await Process.update(
      { action: "downloading", percent: 0 },
      {
        where: { id: pc.id },
        silent: true,
      }
    );

    if (!fs.existsSync(`${global.dirPublic}${slug}`)) {
      fs.mkdirSync(`${global.dirPublic}${slug}`, { recursive: true });
    }

    if (row?.type == "gdrive") {
      let gauth = await Google.GRand({ userId: row?.userId });
      let token = `${gauth?.token_type} ${gauth?.access_token}`;

      if (!gauth?.token_type || !gauth?.access_token)
        return res.json({ status: false, msg: "no_token" });

      let inputPath = `https://www.googleapis.com/drive/v2/files/${row?.source}?alt=media&source=downloadUrl`;
      outputPath = `${global.dirPublic}${slug}/default`;

      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      let code_curl = `curl "${inputPath}" -H 'Authorization: ${token}' --output "${outputPath}" -#`;
      let shell = await shellPromise(code_curl);
    } else if (row?.type == "linkmp4") {
      let inputPath = row?.source;
      outputPath = `${global.dirPublic}${slug}/default`;
      let code_curl = `axel -n 10 -o "${outputPath}" "${inputPath}"`;
      let shell = await shellPromise(code_curl);
    }
    await Process.update(
      { action: "downloaded", percent: 100 },
      {
        where: { id: pc.id },
        silent: true,
      }
    );
    return res.json({ status: true, msg: "downloaded" });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};

function shellPromise(code_custom) {
  return new Promise(function (resolve, reject) {
    shell.exec(
      code_custom,
      { async: true, silent: true },
      function (code, stdout, stderr) {
        resolve(stderr);
      }
    );
  });
}
