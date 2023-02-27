module.exports = {
  Server: {
    Create: require("./server.create"),
  },
  DL: {
    Data: require("./dl.data"),
    RunTask: require("./dl.run"),
    Start: require("./dl.start"),
    Cancle: require("./dl.cancle"),
    Error: require("./dl.error"),
    Download: require("./dl.download"),
    Remote: require("./dl.remote"),
    RemoteQuality: require("./dl.quality-remote"),
    SuccessQuality: require("./dl.quality-success"),
    Task: require("./dl.task"),
  },
  UPTASK: {
    Downloading: require("./update.task-downloading"),
    Percent: require("./update.task-percent"),
  },
};
