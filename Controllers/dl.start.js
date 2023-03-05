"use strict";

const { Files, Servers, Process } = require(`../Models`);
const { GetIP, getSets, Task } = require(`../Utils`);
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const path = require("path");
const fs = require("fs-extra");

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;

    if (!slug) return res.json({ status: false });

    if (fs.existsSync(path.join(global.dirPublic, "task.json"))) {
      let check = await Task();
      if (check?.slug != undefined) {
        return res.json({ status: false, msg: "server_busy" });
      } else {
        fs.unlinkSync(path.join(global.dirPublic, "task.json"));
      }
    }

    const sv_ip = await GetIP();
    let sets = await getSets();

    let server = await Servers.Lists.findOne({
      raw: true,
      where: {
        sv_ip,
        active: 1,
        work: 0,
      },
    });

    if (!server) return res.json({ status: false, msg: "server_busy" });

    let row = await Files.Lists.findOne({
      raw: true,
      where: {
        slug,
        type: { [Op.or]: ["gdrive", "linkmp4"] },
        e_code: 0,
      },
    });
    if (!row) return res.json({ status: false, msg: "not_exists" });

    let data = {
      userId: row?.userId,
      serverId: server?.id,
      fileId: row?.id,
      type: "download",
    };
    let db_create = await Process.create(data);

    if (db_create?.id) {
      await Files.Lists.update(
        { e_code: 1 },
        {
          where: { id: data.fileId },
          silent: true,
        }
      );
      await Servers.Lists.update(
        { work: 1 },
        {
          where: { id: data.serverId },
          silent: true,
        }
      );
      //create task
      let task = {
        slug: slug,
        quality: [],
        downloading: false,
        remoting: false,
        download: {},
        remote: {},
        processId: db_create?.id,
        fileId: row?.id,
      };
      await Task(task);
      console.log(`start ${slug} done`);
      shell.exec(
        `sudo bash ${global.dir}/shell/download.sh ${slug}`,
        { async: false, silent: false },
        function (data) {}
      );
      return res.json({ status: true, msg: `start`, slug });
    } else {
      return res.json({ status: false, msg: `db_err` });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
