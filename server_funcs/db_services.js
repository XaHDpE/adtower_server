// require('firebase/database');
const admin = require('firebase-admin');
const firebase = require('firebase/app');
const config = require('../config/applicationConfig.js');

firebase.initializeApp(config);

module.exports = {

  insertEmptyRecordForClip: (userId) => {
    const ref = admin.database().ref(`videos/${userId}/uploaded`).push();
    return ref.key;
  },

  /*
  addVideoToPlaylist: (playlistRef, videoClipId, orderNumber) => {
    playlistRef.child
    admin.database()
        .ref(`videos/${userId}/playlists/${playListId}`).push(
            {
              order_number: orderNumber,
            }
        );
  },
   */

  newPlaylist: (userId, name, videos) => {
    const playlistKey = admin.database()
        .ref(`videos/${userId}/playlists`).push(
            {
              'name': name,
              'created_when': admin.database.ServerValue.TIMESTAMP,
            }
        ).key;
    // insert playlist metadata
    // insert video clip references
    admin.database().ref(`videos/${userId}/playlists/${playlistKey}/videos`)
        .set(videos)
        .then( () => {
          return console.log('done');
        });
    return playlistKey;
  },

  deleteVideoRecord(userId, recKey) {
    const ref = admin.database().ref(`videos/${userId}/uploaded/${recKey}`);
    ref.remove()
        .then( ()=> {
          console.log('Record with pk ' + recKey +
            'is deleted from Videos for user ' + userId);
        })
        .catch( (error) => {
          console.error(error);
        });
  },

  getDbFilesDataByUserUid: (userId) => {
    const query = admin.database().ref(`videos/${userId}/uploaded`)
        .orderByKey();
    return query.once('value')
        .then((snapshot) => {
          const result = [];
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

  getVideoRecord: (userId, recKey) => {
    const ref = admin.database().ref(`videos/${userId}/uploaded/${recKey}`);
    return ref.once('value')
        .then((snapshot) => {
          const obj = {};
          obj.pk = snapshot.key;
          obj.urlVideo = snapshot.val().url_video;
          obj.pathVideo = snapshot.val().path_video;
          obj.urlThumbnail = snapshot.val().url_thumbnail;
          obj.pathThumbnail = snapshot.val().path_thumbnail;
          return obj;
        });
  },

};

