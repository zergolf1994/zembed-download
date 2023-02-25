"use strict";
const fs = require("fs-extra");
const { Files, Servers, Process } = require(`../Models`);
const { Sequelize, Op } = require("sequelize");
const { Google, GetUser } = require(`../Utils`);
const { where } = require("../Models/conn");

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.json({ status: "false" });
    let row = await Files.Lists.findOne({
      raw: true,
      where: {
        slug,
        type: { [Op.or]: ["gdrive", "link_mp4"] },
      },
    });
    if (!row) return res.json({ status: "false", msg: "not_exists" });

    let userSets = await GetUser.Sets({ userId: row?.userId });
    if (userSets?.video_process != "1") {
      return res.json({
        status: "false",
        msg: "user_not_active_video_process",
      });
    }

    let output = {
      status: "false",
    };

    let outPutPath = `${global.dirPublic}${slug}`;
    if (!fs.existsSync(outPutPath)) {
      fs.mkdirSync(outPutPath, { recursive: true });
    }
    //output.user = userSets;
    if (row?.type == "gdrive") {
      //check_default
      let gInfo = await Google.Info(row);
      //output.gInfo = gInfo;

      if (gInfo?.videoMediaMetadata) {
        let quality_allow = [];
        // set allow
        for (const key in userSets) {
          if (Object.hasOwnProperty.call(userSets, key)) {
            if (
              [
                "process_1080",
                "process_720",
                "process_480",
                "process_360",
              ].includes(key)
            ) {
              if (userSets[key] == "1") {
                quality_allow.push(key.replace("process_", ""));
              }
            }
          }
        }

        if (!quality_allow.length) {
          output.msg = "no_quality_allow";
        } else {
          let quality_name = await Files.Datas.findAll({
            raw: true,
            attributes: ["name"],
            where: {
              type: "video",
              fileId: row?.id,
              userId: row?.userId,
              name: { [Op.in]: ["1080", "720", "480", "360"] },
            },
            order: [["userId", "asc"]],
          }).then((row) => {
            return row.map((row) => {
              return row?.name;
            });
          });

          //download quality
          let gSource = await Google.Source(row);
          let quality = [],
            vdo = {};

          for (const key in gSource) {
            if (gSource.hasOwnProperty.call(gSource, key)) {
              if (quality_allow.includes(key) && !quality_name.includes(key)) {
                quality.push(key);
                vdo[`file_${key}`] = gSource[key];
              }
            }
          }
          if (quality_name.length && !quality.length) {
            output.status = "ok";
            output.type = "gdrive_quality_done";
          } else if (!quality.length) {
            output.msg = "no_quality";
          } else {
            let cookie = gSource?.cookie
              .replace('","', ";")
              .replace('["', "")
              .replace('"]', "");

            if (!cookie) {
              output.msg = "no_cookie";
            } else {
              await Process.update(
                {
                  quality: quality.join(),
                },
                {
                  where: {
                    type: "download",
                    fileId: row?.id,
                    userId: row?.userId,
                  },
                }
              );
              output.status = "ok";
              output.type = "gdrive_quality";
              output.quality = quality;
              output.vdo = vdo;
              output.cookie = cookie;
              output.outPutPath = outPutPath;
              output.speed = userSets.download_speed || 20;
            }
          }
        }
      }

      if (output.status == "false" && gInfo.kind == "drive#file") {
        //download default
        if (userSets?.process_default == "1") {
          let gToken = await Google.GRand(row);
          if (gToken) {
            await Process.update(
              {
                quality: "default",
              },
              {
                where: {
                  type: "download",
                  fileId: row?.id,
                  userId: row?.userId,
                },
              }
            );
            output.status = "ok";
            output.soruce = `https://www.googleapis.com/drive/v2/files/${row?.source}?alt=media&source=downloadUrl`;
            output.type = "gdrive_default";
            output.authorization = `${gToken?.token_type} ${gToken?.access_token}`;
            output.msg = "download_default";
            output.outPutPath = outPutPath;
            output.speed = userSets.download_speed || 20;
          } else {
            output.msg = "no_token";
          }
        } else {
          output.msg = "no_quality_default";
        }
      }
    } else if (row?.type == "link_mp4") {
      await Process.update(
        {
          quality: "default",
        },
        {
          where: {
            type: "download",
            fileId: row?.id,
            userId: row?.userId,
          },
        }
      );
      output.status = "ok";
      output.type = "link_mp4_default";
      output.soruce = row?.source;
      output.msg = "download_link_mp4";
      output.outPutPath = outPutPath;
      output.speed = userSets.download_speed || 20;
    }

    return res.json({ ...output });
  } catch (error) {
    return res.json({ status: "false" });
  }
};
