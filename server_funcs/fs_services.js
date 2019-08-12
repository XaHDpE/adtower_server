const admin = require('firebase-admin');
const firebase = require('firebase/app');
const config = require('../config/applicationConfig.js');
const dbs = require('./db_services');

if (!firebase.apps.length) {
  firebase.initializeApp(config);
}

module.exports = {

  uploadFile: (userData, file) => {
    const bucket = admin.storage().bucket();
    return new Promise((resolve, reject) => {
      if (!file) {
        Error('No file');
      } else if ( !file.originalname.split('.').pop() ) {
        Error('Files with no extensions forbidden for upload');
      }

      // newFileName = `${userData.uid}/${Date.now()}_${file.originalname}`;
      const dbKey = dbs.insertEmptyRecordForClip(userData.uid);
      newFileName = dbKey + '.' + file.originalname.split('.').pop();
      const fileUpload = bucket.file(newFileName);

      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            uploadedBy: userData.uid,
          },
        },
      });

      blobStream.on('error', (error) => {
        Error('Something is wrong! Unable to upload at the moment.');
      });

      blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const url = format(`https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`);
        resolve(url);
      });

      blobStream.end(file.buffer);
    });
  },

  removeFile: (filePath) => {
    const fRef = storage.ref(filePath);
    console.log(`File to be deleted: ${fRef.name}`);
    fRef.delete()
        .then( ()=> {
          console.log(`File ${filePath} is removed`);
        }
        )
        .catch((error) => {
          console.error(`Unable to delete ${filePath}.`, error);
        });
  },

};
