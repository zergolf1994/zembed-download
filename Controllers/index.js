module.exports = {
  Server: {
    Create: require("./server.create"),
  },
  DL: {
    Data: require("./dl.data"),
    RunTask: require("./dl.run"),
    Start: require("./dl.start"),
    Cancle: require("./dl.cancle"),
    Download: require("./dl.download"),
    Remote: require("./dl.remote"),
    RemoteQuality: require("./dl.quality-remote"),
    SuccessQuality: require("./dl.quality-success"),
  },
};
