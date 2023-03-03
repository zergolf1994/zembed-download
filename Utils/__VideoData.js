"use strict";
const ffmpeg = require("fluent-ffmpeg");

module.exports = async (pathVideo) => {
  try {
    return new Promise((resolve, reject) => {
      ffmpeg(pathVideo).ffprobe((err, data) => {
        if (err) {
          resolve({ error: true });
        }
        resolve(data);
      });
    });
  } catch (error) {
    //console.error(error);
    return { error: true };
  }
};
