"use strict";

const express = require("express");
const router = express.Router();
//const { AuthJwt } = require("./Utils");
const Control = require("./Controllers");
//data
router.route("/server/create").get(Control.Server.Create);

//download
router.route("/data").get(Control.DL.Data);
router.route("/run").get(Control.DL.RunTask);
router.route("/start").get(Control.DL.Start);
router.route("/cancle").get(Control.DL.Cancle);
router.route("/error").get(Control.DL.Error);
router.route("/download").get(Control.DL.Download);
router.route("/remote").get(Control.DL.Remote);

router.route("/remote-quality").get(Control.DL.RemoteQuality);
router.route("/success-quality").get(Control.DL.SuccessQuality);

router.all("*", async (req, res) => {
  res.status(500).end();
});

module.exports = router;
