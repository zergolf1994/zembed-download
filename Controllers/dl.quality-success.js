"use strict";

const { Client } = require("node-scp");
const { Op } = require("sequelize");
const { Files, Servers, Storages, Process } = require(`../Models`);
const { getSets } = require(`../Utils`);
const shell = require("shelljs");
const request = require("request");

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;
    let sets = await getSets();

    if (!slug) return res.json({ status: false });

    let row = await Files.Lists.findOne({
      //raw: true,
      where: {
        slug,
      },
      include: [
        {
          model: Files.Datas,
          as: "datas",
          required: true,
        },
      ],
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

    let vdo = row?.datas,
      list_video = [],
      list_delete = [];
    for (const key in vdo) {
      if (vdo.hasOwnProperty.call(vdo, key)) {
        //const element = vdo[key];
        if (
          ["1080", "720", "480", "360"].includes(vdo[key].name) &&
          vdo[key].type == "video"
        ) {
          list_video.push(vdo[key]);
        }
        if (vdo[key].name == "default" && vdo[key].type == "video") {
          list_delete.push(vdo[key]);
        }
      }
    }
    let pc_quality = pc?.quality.split(',');
    let check_done = 0;
    for (const key in list_video) {
      let q = list_video[key].name;
      if (pc_quality.includes(q.toString())) {
        check_done++;
      }
    }

    if (list_delete.length) {
      //delete by scp
      await DeleteFileStorage({
        data: list_delete[0],
        slug,
        dir: "/home/files",
      });
    }

    if(pc_quality.length == check_done){
      await Files.Lists.update(
        { e_code: 0, s_convert: 1, s_video: 1 },
        { where: { id: pc?.fileId } }
      );
    }else{
      await Files.Lists.update(
        { e_code: 222, s_convert: 0, s_video: 1 },
        { where: { id: pc?.fileId } }
      );
    }

    await Servers.Lists.update({ work: 0 }, { where: { id: pc?.serverId } });
    let db_delete = await Process.destroy({ where: { id: pc?.id } });

    if (db_delete) {
      shell.exec(
        `sudo rm -rf ${global.dirPublic}`,
        { async: false, silent: false },
        function (data) {}
      );
      return res.json({ status: true, msg: `success` });
    } else {
      return res.json({ status: false, msg: `db_err` });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};

async function DeleteFileStorage({ data, slug, dir }) {
  return new Promise(async function (resolve, reject) {
    let sg_db = await Storages.Lists.findOne({
      where: {
        id: data?.storageId,
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

    let server = {
      host: sv_storage?.sv_ip,
      port: sv_storage?.port,
      username: sv_storage?.username,
      password: sv_storage?.password,
    };

    let pathDelete = `${dir}/${slug}/${data?.value}`;

    Client(server)
      .then(async (client) => {
        await client
          .unlink(pathDelete)
          .then(async () => {
            client.close();
            // delete sql
            await Files.Datas.destroy({ where: { id: data?.id } });
            resolve(true);
          })
          .catch((error) => {
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
