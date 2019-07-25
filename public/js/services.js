const admin = require('firebase-admin');

module.exports = {

    getFilesByUserUid: userUid => admin.storage().bucket().getFiles({prefix: userUid + "/"} )

};
