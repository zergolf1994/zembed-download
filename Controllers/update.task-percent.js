"use strict";
const path = require("path");
const fs = require("fs-extra");
const request = require("request");

const { Process } = require(`../Models`);
const { Task, DownloadStatus } = require(`../Utils`);

module.exports = async (req, res) => {
  try {
    let file_task = path.join(global.dirPublic, "task.json");
    if (!fs.existsSync(file_task)) {
      return res.json({ status: "false", msg: "no_file_task" });
    }
    let data_update_task = {};
    let task = await Task();
    let q = task.quality;
    let remoting = task?.remoting;
    if (remoting != false) {
      let task_remote = task?.remote;

      let data_remote = {};
      let task_download = task?.download;
      for (const key in q) {
        let data_q = task_remote[`file_${q[key]}`];

        if (data_q?.sv_ip) {
          let data_dl = task_download[`file_${q[key]}`];
          let data_upload = await getReq(
            `http://${data_q?.sv_ip}/file/data/${task?.slug}/${data_q?.name}`
          );
          
          let new_update = {
            ...data_q,
          };
          if (data_q?.size == 0 || data_q?.size == undefined) {
            new_update.size = data_dl?.size;
          }

          if (data_upload?.upload != data_q?.upload) {
            new_update.upload = data_upload?.size || 0;
          }

          new_update.percent = (
            (new_update.upload * 100) / new_update.size ?? 0
          ).toFixed(0) || 0;

          data_remote[`file_${q[key]}`] = new_update;
        } else {
          data_remote[`file_${q[key]}`] = data_q;
        }
      }

      data_update_task.remote = data_remote
    }

    let downloading = task?.downloading;
    let tmp_dl = `${global.dirPublic}${task?.slug}/file_${downloading}.txt`;
    let tmp_file = `${global.dirPublic}${task?.slug}/file_${downloading}${
      downloading != "default" ? ".mp4" : ""
    }`;
    //check file
    if (!fs.existsSync(tmp_dl)) {
      return res.json({ status: "false", msg: "no_file_tmp" });
    }
    let size_downloading = 0;
    if (fs.existsSync(tmp_file)) {
      let stats = await fs.statSync(tmp_file);
      size_downloading = stats?.size || 0;
    }
    //get data
    let data_dl = await fs.readFileSync(`${tmp_dl}`, "utf8");
    let dl_status = await DownloadStatus.Axel(data_dl);

    if (dl_status?.err) {
      return res.json({
        status: "false",
        msg: "download_error",
        slug: task?.slug,
        e_code: dl_status?.err == `server_unsupported` ? 334 : 333,
      });
    }

    let { percent: precen_download, filesize } = dl_status;
    let data_download = {};
    let task_download = task?.download;
    let update_task = true;
    for (const key in q) {
      let data_q = task_download[`file_${q[key]}`];
      if (q[key] == downloading) {
        if (data_q?.percent == 100) {
          update_task = false;
        }
        data_download[`file_${q[key]}`] = {
          percent: precen_download,
          size: filesize,
          save: size_downloading,
        };
      } else {
        data_download[`file_${q[key]}`] = {
          percent: data_q?.percent || 0,
          size: data_q?.size || 0,
          save: data_q?.save || 0,
        };
      }
    }
    data_update_task.download = data_download;
    await Task(data_update_task);
    
    await Process.update(
      { action: JSON.stringify(data_update_task) },
      { where: { id: task?.processId } }
    );

    return res.json({ status: "ok", msg: "updated" });
  } catch (error) {
    console.log(error);
    return res.json({ status: "false", msg: error.name });
  }
};

function getReq(url) {
  try {
    return new Promise(async function (resolve, reject) {
      if (!url) resolve({ error: true });
      request({ url }, function (error, response, body) {
        if (!body) reject();
        resolve(JSON.parse(body));
      });
    });
  } catch (error) {
    return { error: true };
  }
}
