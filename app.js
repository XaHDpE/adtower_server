const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const dbs = require('./public/js/db_services');
const fss = require('./public/js/fs_services');

// Initialize Admin SDK.
admin.initializeApp({
  credential: admin.credential.cert('./config/serviceAccountKeys.json'),
  databaseURL: 'https://adtower-server.firebaseio.com',
  storageBucket: 'gs://adtower-server.appspot.com',
});

/** File upload */
// const {format} = require('util');
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
 * Checks if a user is signed in and if so, redirects to My Videos page.
 * @param {string} url The URL to check if signed in.
 * @return {function} The middleware function to run.
 */
function checkIfSignedIn(url) {
  return function(req, res, next) {
    if (req.url == url) {
      const sessionCookie = req.cookies.session || '';
      // User already logged in. Redirect to Videos page.
      admin.auth().verifySessionCookie(sessionCookie)
          .then(function(decodedClaims) {
            res.redirect('/videos');
          }).catch(function(error) {
            next();
          });
    } else {
      next();
    }
  };
}


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
        (Math.random() * 100000000000000000).toString()),
);
// If a user is signed in, redirect to videos page.
app.use(checkIfSignedIn('/'));
// Serve static content from public folder.
app.use('/', express.static('public'));

/** Get library endpoint. */
app.get('/library', (req, res) => {
  // Get session cookie.
  const sessionCookie = req.cookies.session || '';
  admin.auth().verifySessionCookie(sessionCookie, true /** check if revoked. */)
      .then((decodedClaims) => {
      // Serve content for signed in user.
        admin.auth().getUser(decodedClaims.sub).then((userRecord) => {
          dbs.getDbFilesDataByUserUid(userRecord.uid)
              .then((data) => {
                // services.getDbFilesDataByUserUid(userRecord.uid);
                return res.render('library', {
                  navKey: 'library',
                  user: userRecord,
                  files: data,
                });
              });
        });
      }).catch((error) => {
        res.redirect('/');
      });
});

/** Get videos endpoint. */
app.get('/videos', (req, res) => {
  // Get session cookie.
  checkUserClaims(req, res, (userRecord) => {
    dbs.getDbFilesDataByUserUid(userRecord.uid)
        .then((data) => {
        // services.getDbFilesDataByUserUid(userRecord.uid);
          return res.render('videos', {
            navKey: 'videos',
            user: userRecord,
            files: data,
          });
        });
  });
});

/** File upload endpoint */
app.post('/upload', multer.single('file'), (req, res) => {
  checkUserClaims(req, res, (userRecord) => {
    const file = req.file;
    if (file) {
      fss.uploadFile(userRecord, file).then((success) => {
        res.status(200).send({
          status: 'success',
        });
      }).catch((error) => {
        console.error(error);
      });
    }
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
        const options = {
          maxAge: expiresIn,
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

/** About endpoint */
app.get('/about', (req, res) => {
  checkUserClaims(req, res, (userRec) => {
    return res.render('about', {
      navKey: 'about',
      user: userRec,
    });
  });
});

/** Wrapper function for security check
 * @param {request} req request
 * @param {response} res response
 * @param {function} fnc callback function
 */
function checkUserClaims(req, res, fnc) {
  const sessionCookie = req.cookies.session || '';
  admin.auth().verifySessionCookie(sessionCookie, true /** check if revoked. */)
      .then((decodedClaims) => {
      // Serve content for signed in user.
        admin.auth().getUser(decodedClaims.sub).then((userRecord) => {
          fnc(userRecord);
        });
      }).catch(function(error) {
        res.redirect('/');
      });
}

app.get('/delete_video', function(req, res) {
  checkUserClaims(req, res, (userData) => {
    dbs.deleteVideoRecord(userData.uid, req.query.recordKey);
    /*
    dbs.getVideoRecord(userData.uid, req.query.recordKey)
      .then((videoRec) => {
        fss.removeFile(videoRec.pathVideo);
        }
      );


    const path = `videos/${userData.uid}/${req.query.recordKey}`;
    let dbRef = admin.database().ref(path);
    dbRef.once('value')
      .then( (snapshot) => {
        const pathVideo = (snapshot.val() && snapshot.val().path_video);
        // let filesToDelete = [ (snapshot.val() && snapshot.val().path_video),
        (snapshot.val() && snapshot.val().path_thumbnail) ];
        admin.storage().bucket().deleteFiles({ prefix: pathVideo})
          .then( () => {
            console.log(`files ${pathVideo} are deleted.`);
        });
      })
      .catch((error) => {
        console.error(error);
      });
    dbRef.remove()
      .then((data) => {
        console.log(`db record via ${path} is deleted`);
        }
      )
      .catch((error) => {
        console.error("problems with db record delete.", error);
      });
     */
  });
});


// Start http server and listen to port 3000.

app.set('view engine', 'pug');

app.listen(3000, function() {
  console.log('Sample app listening on port 3000!');
});
