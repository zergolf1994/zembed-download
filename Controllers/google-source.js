"use strict";

const { Google, Allow } = require(`../Utils`);

module.exports = async (req, res) => {
  try {
    let { source, userId } = req.query;
    if (!source) return res.json({ status: false, msg: "invalid" });
    let allow = Allow.Files(source);
    if (!allow?.status)
      return res.json({ status: false, msg: "not_supported" });
    let data = {
      type: allow?.type,
      source: allow?.source,
    };
    if (userId) data.userId = userId;

    if (data.type == "gdrive") {
      let drive_info = await Google.Source(data);
      
      if (drive_info?.error) {
        return res.json({
          status: false,
          msg: drive_info.error.message,
        });
      }
      return res.json({ status: true, drive_info });
    } else {
      return res.json({ status: false });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
