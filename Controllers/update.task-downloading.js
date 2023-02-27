"use strict";
const { Task } = require(`../Utils`);

module.exports = async (req, res) => {
  try {
    const { quality } = req.query;
    if (!quality) return res.json({ status: "false" });
    let task = await Task();
    let q = task.quality;
    
    if (!q.includes(quality))
      return res.json({ status: "false", msg: `quality not macth`, q });

    await Task({ downloading: quality });

    return res.json({ status: "ok", msg: "updated" });
  } catch (error) {
    console.log(error);
    return res.json({ status: "false", msg: error.name });
  }
};
