"use strict";

module.exports = {
  GetIP: require("./_Get_IP"),
  GetHN: require("./_Get_HN"),
  CheckDisk: require("./_CheckDisk"),
  Generate: require("./_Generate"),
  //AuthJwt: require("./_AuthJWT"),
  Google: require("./_Google"),
  Allow: require("./_Allow"),
  Proxy: require("./_Proxy"),
  getSets: require("./_Settings"),
  Pagination: require("./_Pagination"),
  Search: require("./_Search"),
  TimeSleep: require("./_TimeSleep"),
  VideoData: require("./__VideoData"),
  GetUser: require("./_Get_User"),
  Task: require("./_Task"),
  DownloadStatus: {
    Axel: require("./__AxelStatus"),
  },
};
