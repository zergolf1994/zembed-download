module.exports = {
  Server: {
    Create: require("./server.create"),
  },
  DL: {
    RunTask: require("./dl.run"),
    Start: require("./dl.start"),
    Cancle: require("./dl.cancle"),
    Download: require("./dl.download"),
    Remote: require("./dl.remote"),
  },
};
