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
    const result = [];
    const query = admin.database().ref(`videos/${userUid}`).orderByKey();
    return query.once('value')
        .then((snapshot) => {
          snapshot.forEach((childSnapshot) => {
            const obj = {};
            obj.pk = childSnapshot.key;
            obj.urlVideo = childSnapshot.val().url_video;
            obj.pathVideo = childSnapshot.val().path_video;
            obj.urlThumbnail = childSnapshot.val().url_thumbnail;
            obj.pathThumbnail = childSnapshot.val().path_thumbnail;
            result.push(obj);
          });
          return result;
        });
  },

};
