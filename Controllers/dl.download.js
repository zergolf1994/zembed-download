"use strict";
const path = require("path");
const fs = require("fs-extra");
const shell = require("shelljs");

const { Files, Servers, Procress } = require(`../Models`);
const {
  SCP,
  Alert,
  GetIP,
  Google,
  Get_Video_Data,
  GetOne,
} = require(`../Utils`);
const { Sequelize, Op } = require("sequelize");

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;
    let outputPath;
    if (!slug) return res.json({ status: false });
    let storageId;
    let row = await Files.Lists.findOne({
      where: {
        slug,
      },
    });

    if (!row) return res.json(Alert({ status: false, msg: "not_exists" }, `w`));

    let process = await Procress.findOne({
      raw: true,
      where: {
        fileId: row?.id,
        type: "download",
      },
    });

    if (!process)
      return res.json(Alert({ status: false, msg: "not_exists" }, `w`));

    if (!fs.existsSync(`${global.dirPublic}${slug}`)) {
      fs.mkdirSync(`${global.dirPublic}${slug}`, { recursive: true });
    }

    if (row?.type == "gdrive") {
      let gauth = await Google.Auth.Rand({ userId: row?.uid });
      let token = `${gauth?.token_type} ${gauth?.access_token}`;

      if (!gauth?.token_type || !gauth?.access_token)
        return res.json(Alert({ status: false, msg: "no_token" }, `d`));

      let inputPath = `https://www.googleapis.com/drive/v2/files/${row?.source}?alt=media&source=downloadUrl`;

      outputPath = `${global.dirPublic}${slug}/default`;

      let code_curl = `curl "${inputPath}" -H 'Authorization: ${token}' --output "${outputPath}" -#`;

      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      let shell = await ShellExec(code_curl);
    }

    if (!fs.existsSync(outputPath)) {
      return res.json(Alert({ status: false, msg: "download_error" }, `s`));
    }
    let video_data = await Get_Video_Data(outputPath);
    let { size, format_name } = video_data?.format;
    let ext;
    if (format_name.includes("mp4")) {
      let { width, height, duration, codec_name } = video_data?.streams[0];

      // update files
      let file_update = {
        duration: duration?.toFixed(0) || 0,
        size: size,
      };
      await Files.Lists.update(file_update, {
        where: { id: row?.id },
      });
      ext = "mp4";
    } else if (format_name.includes("ts")) {
      let { width, height, duration, codec_name } = video_data?.streams[0];

      // update files
      let file_update = {
        duration: duration?.toFixed(0) || 0,
        size: size,
      };
      await Files.Lists.update(file_update, {
        where: { id: row?.id },
      });
      ext = "ts";
    } else if (format_name.includes("matroska")) {
      ext = "mkv";
    } else if (format_name.includes("webm")) {
      ext = "webm";
    }

    let sv_storage = await GetOne.Storage();
    if (sv_storage != undefined) {
      await SCP.Storage({
        file: outputPath,
        save: `file_default.${ext}`,
        row: row,
        dir: `/home/files/${row.slug}`,
        sv_storage: sv_storage,
      });
    }

    await Servers.Lists.update(
      { status: 0 },
      { where: { id: process?.serverId } }
    );
    await Procress.destroy({ where: { id: process?.id } });
    shell.exec(
      `sudo rm -rf ${global.dirPublic}${row?.slug}`,
      { async: false, silent: false },
      function (data) {}
    );
    return res.json(Alert({ status: true, ext }, `s`));
  } catch (error) {
    console.log(error);
    return res.json(Alert({ status: false, msg: error.name }, `d`));
  }
};

function ShellExec(code_custom) {
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
