"use strict";
const path = require("path");
const fs = require("fs-extra");
const shell = require("shelljs");
const request = require("request");
const { Client } = require("node-scp");

const { Files, Servers, Storages, Process } = require(`../Models`);
const { Google, VideoData, getSets, Task } = require(`../Utils`);
const { Sequelize, Op } = require("sequelize");

module.exports = async (req, res) => {
  try {
    const { slug, quality } = req.query;
    let outputPath, storageId;

    if (!slug || !quality) return res.json({ status: false });

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

    outputPath = `${global.dirPublic}${slug}/file_${quality}.mp4`;

    if (!fs.existsSync(outputPath)) {
      // cancle this video
      return res.json({ status: false, msg: "download_error" });
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

    let video_data = await VideoData(outputPath);
    let { size } = video_data?.format;
    let { width, height } = video_data?.streams[0];

    let vdo_data = {
      active: 1,
      type: "video",
      name: quality,
      value: `file_${quality}.mp4`,
      mimetype: "video/mp4",
      mimesize: `${width}x${height}`,
      size: size,
      storageId: sv_storage.id,
      userId: pc?.userId,
      fileId: pc?.fileId,
    };
    await RemoteToStorage({
      file: outputPath,
      save: `file_${quality}.mp4`,
      row: row,
      dir: `/home/files/${row.slug}`,
      sv_storage: sv_storage,
      vdo_data,
    });

    return res.json({ status: true, quality, slug });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};

function RemoteToStorage({ file, save, row, dir, sv_storage, vdo_data }) {
  return new Promise(async function (resolve, reject) {
    let task = await Task();
    let q = task.quality;
    let task_remote = task?.remote;
    let data_remote = {};

    for (const key in q) {
      let data_q = task_remote[`file_${q[key]}`];
      if (q[key] == vdo_data?.name) {
        let new_update = {
          quality: vdo_data?.name,
          name: save,
          sv_ip: sv_storage?.sv_ip,
          upload: 0,
          size: 0,
        };
        data_remote[`file_${q[key]}`] = new_update;
      } else if (data_q != undefined) {
        data_remote[`file_${q[key]}`] = data_q;
      }
    }

    await Task({
      remoting: vdo_data?.quality,
      remote: data_remote,
    });

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
            let video = await Files.Datas.findOne({
              raw: true,
              where: {
                type: "video",
                name: vdo_data?.name,
                fileId: row?.id,
              },
            });

            if (video) {
              console.log("update");
              await Files.Datas.update(vdo_data, {
                where: {
                  id: video?.id,
                },
              });
            } else {
              console.log("create");
              await Files.Datas.create({ ...vdo_data });
            }

            request(
              { url: `http://${sv_storage?.sv_ip}/check-disk` },
              function (error, response, body) {
                console.log("cron-check", sv_storage?.sv_ip);
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
