const admin = require('firebase-admin');

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
            obj.path = childSnapshot.val().path;
            obj.tnpath = childSnapshot.val().thumbnail;
            result.push(obj);
          });
          return result;
        });
  },



};
