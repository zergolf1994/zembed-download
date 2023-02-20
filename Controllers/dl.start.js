"use strict";

const { Files, Servers, Process } = require(`../Models`);
const { GetIP, getSets } = require(`../Utils`);
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;

    if (!slug) return res.json({ status: false });
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
      console.log(`start ${slug} done`);
      shell.exec(
        `curl --write-out '%{http_code} download ${slug} done' --silent --output /dev/null "http://127.0.0.1/download?slug=${slug}" &&
        sleep 2 &&
        curl --write-out '%{http_code} remote ${slug} done' --silent --output /dev/null "http://127.0.0.1/remote?slug=${slug}"
        sleep 2 &&
        curl --write-out '%{http_code} cron download' --silent --output /dev/null "http://${sets?.domain_api_admin}/cron/download"
        `,
        { async: false, silent: false },
        function (data) {}
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
