const FCM = require('fcm-node');
const serverKey = require('../config/serviceAccountKeys.json');
const fcm = new FCM(serverKey);

const message = {
  to: '/topics/updates',
  collapse_key: 'your_collapse_key',

  notification: {
    title: 'Title of your push notification',
    body: 'Body of your push notification',
  },

  data: {
    my_key: 'my value',
    my_another_key: 'my another value',
  },
};

module.exports = {

  sendMessage: () => {
    fcm.send();
    fcm.send(message, function(err, response) {
      if (err) {
        console.log('Something has gone wrong!');
      } else {
        console.log('Successfully sent with response: ', response);
      }
    });
  },

};
