const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const services = require('./public/js/services');

/** File upload */
const {format} = require('util');
const Multer = require('multer');
const multer = new Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});

/*
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {window} = new JSDOM();
const {document} = (new JSDOM('')).window;
global.document = document;
const $ = jQuery = require('jquery')(window);
 */


const uploadFile = (userData, file) => {
  const bucket = admin.storage().bucket();
  return new Promise((resolve, reject) => {
    if (!file) {
      Error('No file');
    }

    const newFileName = `${userData.uid}/${Date.now()}_${file.originalname}`;
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
};


/**
 * Attaches a CSRF token to the request.
 * @param {string} url The URL to check.
 * @param {string} cookie The CSRF token name.
 * @param {string} value The CSRF token value to save.
 * @return {function} The middleware function to run.
 */
function attachCsrfToken(url, cookie, value) {
  return function(req, res, next) {
    if (req.url == url) {
      res.cookie(cookie, value);
    }
    next();
  };
}

/**
 * Checks if a user is signed in and if so, redirects to profile page.
 * @param {string} url The URL to check if signed in.
 * @return {function} The middleware function to run.
 */
function checkIfSignedIn(url) {
  return function(req, res, next) {
    if (req.url == url) {
      const sessionCookie = req.cookies.session || '';
      // User already logged in. Redirect to profile page.
      admin.auth().verifySessionCookie(sessionCookie)
          .then(function(decodedClaims) {
            res.redirect('/profile');
          }).catch(function(error) {
            next();
          });
    } else {
      next();
    }
  };
}

// Initialize Admin SDK.
admin.initializeApp({
  credential: admin.credential.cert('./config/serviceAccountKeys.json'),
  databaseURL: 'https://adtower-server.firebaseio.com',
  storageBucket: 'gs://adtower-server.appspot.com',
});

// Support JSON-encoded bodies.
app.use(bodyParser.json());
// Support URL-encoded bodies.
app.use(bodyParser.urlencoded({
  extended: true,
}));
// Support cookie manipulation.
app.use(cookieParser());
// Attach CSRF token on each request.
app.use(
    attachCsrfToken('/', 'csrfToken',
        (Math.random() * 100000000000000000).toString())
);
// If a user is signed in, redirect to profile page.
app.use(checkIfSignedIn('/',));
// Serve static content from public folder.
app.use('/', express.static('public'));

/** Get profile endpoint. */
app.get('/profile', (req, res) => {
  // Get session cookie.
  const sessionCookie = req.cookies.session || '';
  admin.auth().verifySessionCookie(sessionCookie, true /** check if revoked. */)
      .then( (decodedClaims) => {
        // Serve content for signed in user.
        admin.auth().getUser(decodedClaims.sub).then((userRecord) => {
          services.getDbFilesDataByUserUid(userRecord.uid)
              .then( (data)=> {
                console.log('data:' + data);
                // services.getDbFilesDataByUserUid(userRecord.uid);
                return res.render('profile', {
                  user: userRecord,
                  files: data,
                });
              });
        });
      }).catch( (error) => {
        res.redirect('/');
      });
});

/** File upload endpoint */
app.post('/upload', multer.single('file'), (req, res) => {
  const sessionCookie = req.cookies.session || '';
  admin.auth().verifySessionCookie(sessionCookie, true /** check if revoked. */)
      .then((decodedClaims) => {
        // Serve content for signed in user.
        admin.auth().getUser(decodedClaims.sub).then((userRecord) => {
          const file = req.file;
          if (file) {
            uploadFile(userRecord, file).then((success) => {
              res.status(200).send({
                status: 'success',
              });
            }).catch((error) => {
              console.error(error);
            });
          }
        });
      }).catch(function(error) {
        res.redirect('/');
      });
});

/** Session login endpoint. */
app.post('/sessionLogin', function(req, res) {
  // Get ID token and CSRF token.
  const idToken = req.body.idToken.toString();
  const csrfToken = req.body.csrfToken.toString();

  // Guard against CSRF attacks.
  if (!req.cookies || csrfToken !== req.cookies.csrfToken) {
    res.status(401).send('UNAUTHORIZED REQUEST!');
    return;
  }
  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  admin.auth().verifyIdToken(idToken).then(function(decodedClaims) {
    if (new Date().getTime() / 1000 - decodedClaims.auth_time < 5 * 60) {
      return admin.auth().createSessionCookie(idToken, {expiresIn: expiresIn});
    }
    throw new Error('UNAUTHORIZED REQUEST!');
  })
      .then(function(sessionCookie) {
        // Note httpOnly cookie will not be accessible from javascript.
        // secure flag should be set to true in production.
        const options = {maxAge: expiresIn,
          httpOnly: true, secure: false, /** to test in localhost */
        };
        res.cookie('session', sessionCookie, options);
        res.end(JSON.stringify({status: 'success'}));
      })
      .catch(function(error) {
        res.status(401).send('UNAUTHORIZED REQUEST!');
      });
});

/** User signout endpoint. */
app.get('/logout', function(req, res) {
  // Clear cookie.
  const sessionCookie = req.cookies.session || '';
  res.clearCookie('session');
  // Revoke session too. Note this will revoke all user sessions.
  if (sessionCookie) {
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(function(decodedClaims) {
          return admin.auth().revokeRefreshTokens(decodedClaims.sub);
        })
        .then(function() {
          // Redirect to login page on success.
          res.redirect('/');
        })
        .catch(function() {
          // Redirect to login page on error.
          res.redirect('/');
        });
  } else {
    // Redirect to login page when no session cookie available.
    res.redirect('/');
  }
});

/** User delete endpoint. */
app.get('/delete', function(req, res) {
  const sessionCookie = req.cookies.session || '';
  res.clearCookie('session');
  if (sessionCookie) {
    // Verify user and then delete the user.
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(function(decodedClaims) {
          return admin.auth().deleteUser(decodedClaims.sub);
        })
        .then(function() {
          // Redirect to login page on success.
          res.redirect('/');
        })
        .catch(function() {
          // Redirect to login page on error.
          res.redirect('/');
        });
  } else {
    // Redirect to login page when no session cookie available.
    res.redirect('/');
  }
});

// Start http server and listen to port 3000.

app.set('view engine', 'pug');

app.listen(3000, function() {
  console.log('Sample app listening on port 3000!');
});
