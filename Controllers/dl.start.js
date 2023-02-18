"use strict";

const { Files, Servers, Process } = require(`../Models`);
const { GetIP } = require(`../Utils`);
const { Sequelize, Op } = require("sequelize");

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;

    if (!slug) return res.json({ status: false });
    const sv_ip = await GetIP();
    let server = await Servers.Lists.findOne({
      raw: true,
      where: {
        sv_ip,
        active: 1,
        work: 0,
      },
    });

    if (!server)
      return res.json({ status: false, msg: "server_busy" });

    let row = await Files.Lists.findOne({
      raw: true,
      where: {
        slug,
        type: { [Op.or]: ["gdrive", "linkmp4"] },
        e_code: 0,
        s_video: 0,
        s_backup: 0,
      },
    });
    if (!row) return res.json({ status: false, msg: "not_exists" });

    let data = {
      userId: row?.userId,
      serverId: server?.id,
      fileId: row?.id,
      type: "download",
      quality: "default",
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
      return res.json({ status: true, msg: `created` });
    } else {
      return res.json({ status: false, msg: `db_err` });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
