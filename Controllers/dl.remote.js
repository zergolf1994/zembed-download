"use strict";
const path = require("path");
const fs = require("fs-extra");
const shell = require("shelljs");
const request = require("request");
const { Client } = require("node-scp");

const { Files, Servers, Storages, Process } = require(`../Models`);
const { Google, VideoData, getSets } = require(`../Utils`);
const { Sequelize, Op } = require("sequelize");

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

    outputPath = `${global.dirPublic}${slug}/default`;

    if (!fs.existsSync(outputPath)) {
      // cancle this video
      return res.json({ status: false, msg: "download_error" });
    }
    let video_data = await VideoData(outputPath);
    let { size, format_name } = video_data?.format;
    let ext,
      file_update = {};

    if (format_name.includes("mp4")) {
      ext = "mp4";
    } else if (format_name.includes("ts")) {
      ext = "ts";
    } else if (format_name.includes("matroska")) {
      ext = "mkv";
    } else if (format_name.includes("webm")) {
      ext = "webm";
    }

    if (ext == "mp4" && (!row?.size || !row?.duration)) {
      let { width, height, duration, codec_name } = video_data?.streams[0];
      file_update.duration = duration?.toFixed(0) || 0;
      file_update.size = size;

      await Files.Lists.update(file_update, {
        where: { id: row?.id },
      });
    }

    let sg_db = await Storages.Lists.findOne({
      where: {
        active: 1,
      },
      attributes: ["id", "sv_ip", "disk_percent"],
      include: [
        {
          required: true,
          model: Storages.Sets,
          as: "sets",
          attributes: ["name", "value"],
          where: {
            [Op.or]: [
              {
                name: "username",
                value: { [Op.ne]: "" },
              },
              {
                name: "password",
                value: { [Op.ne]: "" },
              },
              {
                name: "port",
                value: { [Op.ne]: "" },
              },
            ],
          },
        },
      ],
      order: [["disk_percent", "ASC"]],
    });

    if (!sg_db) return res.json({ status: false, msg: "storage_busy" });
    let sv_storage = {};
    sv_storage.id = sg_db?.id;
    sv_storage.sv_ip = sg_db?.sv_ip;
    let sets = sg_db?.sets;

    if (!sets.length) return;

    for (let key in sets) {
      if (sets.hasOwnProperty(key)) {
        let name = sets[key]?.dataValues?.name;
        let value = sets[key]?.dataValues?.value;
        sv_storage[name] = value;
      }
    }
    await RemoteToStorage({
      file: outputPath,
      save: `file_default.${ext}`,
      row: row,
      dir: `/home/files/${row.slug}`,
      sv_storage: sv_storage,
    });

    await Servers.Lists.update({ work: 0 }, { where: { id: pc?.serverId } });
    await Process.destroy({ where: { id: pc?.id } });
    shell.exec(
      `sudo rm -rf ${global.dirPublic}${row?.slug}`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({ status: true });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};

function RemoteToStorage({ file, save, row, dir, sv_storage }) {
  return new Promise(async function (resolve, reject) {
    let sets = await getSets();
    let server = {
      host: sv_storage?.sv_ip,
      port: sv_storage?.port,
      username: sv_storage?.username,
      password: sv_storage?.password,
    };

    Client(server)
      .then(async (client) => {
        let uploadTo = save;
        if (dir) {
          const dir_exists = await client
            .exists(dir)
            .then((result) => {
              return result;
            })
            .catch((error) => {
              return false;
            });

          if (!dir_exists) {
            await client
              .mkdir(dir)
              .then((response) => {
                console.log("dir created", dir);
              })
              .catch((error) => {
                reject();
              });
          }
          uploadTo = `${dir}/${save}`;
        }

        await client
          .uploadFile(file, uploadTo)
          .then(async (response) => {
            let file_data = {
              active: 1,
              type: "video",
              name: "default",
              value: save,
              fileId: row?.id,
              storageId: sv_storage?.id,
              userId: row?.userId,
            };

            let video = await Files.Datas.findOne({
              raw: true,
              where: {
                type: "video",
                name: "default",
                fileId: row?.id,
              },
            });
            if (video) {
              console.log("update");
              await Files.Datas.update(file_data, {
                where: {
                  id: video?.id,
                },
              });
            } else {
              console.log("create");
              await Files.Datas.create({ ...file_data });
            }

            await Files.Lists.update(
              { e_code: 0, s_video: 1 },
              { where: { id: row?.id } }
            );
            // check disk
            request(
              { url: `http://${sv_storage?.sv_ip}/check-disk` },
              function (error, response, body) {
                console.log("cron-check", sv_storage?.sv_ip);
              }
            );

            // disk-used
            request(
              { url: `http://${sets?.domain_api_admin}/cron/disk-used` },
              function (error, response, body) {
                console.log("cron-thumbs", sets?.domain_api_admin);
              }
            );

            // thumbs
            request(
              { url: `http://${sets?.domain_api_admin}/cron/thumbs` },
              function (error, response, body) {
                console.log("cron-thumbs", sets?.domain_api_admin);
              }
            );

            client.close();
            resolve(true);
          })
          .catch((error) => {
            console.log("error", error);
            client.close();
            reject();
          });
      })
      .catch((e) => {
        console.log("e", e);
        client.close();
        reject();
      });
  });
}
