require('firebase/storage');
const admin = require('firebase-admin');
const firebase = require('firebase/app');
const config = require('../../config/applicationConfig.js');

firebase.initializeApp(config);

module.exports = {
  getFilesByUserUid: (userUid) => {
    return admin.storage().bucket().getFiles({prefix: userUid + '/'} );
  },

  getDbFilesDataByUserUid: (userUid) => {
    let result = [];
    const query = admin.database().ref(`videos/${userUid}`).orderByKey();
    return query.once('value')
        .then((snapshot) => {
          snapshot.forEach((childSnapshot) => {
            let obj = {};
            obj.pk = childSnapshot.key;
            obj.urlVideo = childSnapshot.val().url_video;
            obj.pathVideo = childSnapshot.val().path_video;
            obj.urlThumbnail = childSnapshot.val().url_thumbnail;
            obj.pathThumbnail = childSnapshot.val().path_thumbnail;
            console.log("obj:" + obj);
            result.push(obj);
          });
          return result;
        });
  },

  getFilePath: (url) => {
    console.log(url);
    const res = firebase.storage().refFromURL(url);
    console.log("url: " + url + ", res: " + res.name);
    return res;
  }

};
