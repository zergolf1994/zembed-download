"use strict";
const path = require("path");
const fs = require("fs-extra");

const { Process } = require(`../Models`);
const { Task, DownloadStatus } = require(`../Utils`);

module.exports = async (req, res) => {
  try {
    let file_task = path.join(global.dirPublic, "task.json");
    if (!fs.existsSync(file_task)) {
      return res.json({ status: "false", msg: "no_file_task" });
    }

    let task = await Task();
    let q = task.quality;
    let quality = task?.downloading;

    let tmp_dl = `${global.dirPublic}${task?.slug}/file_${quality}.txt`;
    //check file
    if (!fs.existsSync(tmp_dl)) {
      return res.json({ status: "false", msg: "no_file_tmp" });
    }

    //get data
    let data_dl = await fs.readFileSync(`${tmp_dl}`, "utf8");
    let dl_status = await DownloadStatus.Axel(data_dl);
    if (dl_status?.err) {
      return res.json({ status: "false", msg: "download_error" });
    }
    let pcen = dl_status?.percent || 0;
    let array_ = {};
    for (const key in q) {
      if (q[key] == quality) {
        array_[`file_${q[key]}`] = pcen;
      } else {
        let opp = 0;

        if (q[key] == "1080") {
          opp = task?.percent?.file_1080 || 0;
        } else if (q[key] == "720") {
          opp = task?.percent?.file_720 || 0;
        } else if (q[key] == "480") {
          opp = task?.percent?.file_480 || 0;
        } else if (q[key] == "360") {
          opp = task?.percent?.file_360 || 0;
        } else if (q[key] == "default") {
          opp = task?.percent?.file_default || 0;
        }
        array_[`file_${q[key]}`] = opp;
      }
    }

    await Task({ percent: array_ });

    await Process.update(
      { action: JSON.stringify({ percent: array_ }) },
      { where: { id: task?.processId } }
    );

    return res.json({ status: "ok", msg: "updated" });
  } catch (error) {
    console.log(error);
    return res.json({ status: "false", msg: error.name });
  }
};
