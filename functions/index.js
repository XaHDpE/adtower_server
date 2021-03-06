'use strict';

// external dependencies
const functions = require('firebase-functions');
const mkdirp = require('mkdirp-promise');
const admin = require('firebase-admin');
// const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Max height and width of the thumbnail in pixels.
const THUMB_SIZE = '320x240';
// Thumbnail prefix added to file names.
const THUMB_POSTFIX = '_thumb';
const THUMB_EXT = '.png';

admin.initializeApp();

/**
 *  Function to promosify command
 * @param {command} command
 * @return {Promise<any>} result
 */
function promisifyCommand(command) {
  return new Promise((resolve, reject) => {
    command.on('end', resolve).on('error', reject).run();
  });
}

/* Remove files when corresponding database record is deleted. */

exports.sanitizeStorage = functions.database
    .ref('/videos/{userId}/{clipId}/uploaded')
    .onDelete((event) => {
      const filePattern = path.parse(event.val().path_video).name;
      const bucket = admin.storage().bucket();
      console.log(`file pattern: ${filePattern}`);
      bucket.deleteFiles({prefix: filePattern} )
          .then( () => {
            return console.log(`files with prefix ${filePattern} are deleted.`);
          })
          .catch( (error) => {
            console.log('error', error);
          });

      return console.log('function sanitizeStorage finished.');
    });


/**
 * when video is uploaded in the storage bucket,
 * the thumbnail is generated accordingly
 * once the thumbnail is generated, its URL is saved
 * in the Firestore Realtime DB
*/
exports.generateThumbnail = functions.storage.object()
    .onFinalize(async (object) => {
      // File and directory paths.
      const filePath = object.name;
      const fileDir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const thumbFilePath = path.normalize(
          path.join(fileDir, path.parse(fileName).name
            + THUMB_POSTFIX + THUMB_EXT));
      const tempLocalFile = path.join(os.tmpdir(), filePath);
      const tempLocalDir = path.dirname(tempLocalFile);
      const tmpLocTnFile = path.join(os.tmpdir(), thumbFilePath);

      // Exit if this is triggered on a file that is not an image.
      /*
  if (!contentType.startsWith('image/')) {
    return console.log('This is not an image.');
  }
  */

      // Exit if the image is already a thumbnail.
      if (fileName.endsWith(THUMB_EXT)) {
        return console.log('Already a Thumbnail.');
      }

      // Cloud Storage files.
      const bucket = admin.storage().bucket(object.bucket);
      const file = bucket.file(filePath);
      const thumbFile = bucket.file(thumbFilePath);
      const metadata = {
        contentType: 'image/png',
        // To enable Client-side caching you can set the
        // Cache-Control headers here. Uncomment below.
        // 'Cache-Control': 'public,max-age=3600',
      };

      // Create the temp directory where the storage file will be downloaded.
      await mkdirp(tempLocalDir);
      // Download file from bucket.
      await file.download({destination: tempLocalFile});
      console.log('The file has been downloaded to', tempLocalFile);

      const command = ffmpeg(tempLocalFile)
          .on('filenames', (filenames) => {
            console.log('will generate ' + filenames.join(', ') +
              ' in the ' + tempLocalDir + 'folder');
          })
          .setFfmpegPath(ffmpegStatic.path)
          .outputOptions(
              ['-f image2',
                '-vframes 1',
                '-vcodec png',
                '-f rawvideo',
                `-s ${THUMB_SIZE}`,
                '-ss 00:00:05']
          ).output(tmpLocTnFile);

      await promisifyCommand(command);

      console.log(`local tmp file: ${tmpLocTnFile.length}, ${tmpLocTnFile}`);

      // Uploading the Thumbnail.
      await bucket.upload(tmpLocTnFile, {
        destination: thumbFilePath,
        metadata: metadata});

      fs.unlinkSync(tempLocalFile);
      fs.unlinkSync(tmpLocTnFile);
      // Get the Signed URLs for the thumbnail and original image.
      const config = {
        action: 'read',
        expires: '03-01-2500',
      };

      const results = await Promise.all([
        thumbFile.getSignedUrl(config),
        file.getSignedUrl(config),
      ]);
      console.log('Got Signed URLs.');
      const thumbResult = results[0];
      const originalResult = results[1];
      const thumbFileUrl = thumbResult[0];
      const fileUrl = originalResult[0];

      // Add the URLs to the Database

      const newRef = admin.database().ref(
          `videos/${object.metadata['uploadedBy']}/uploaded`);
      await newRef.push({
        url_video: fileUrl,
        url_thumbnail: thumbFileUrl,
        path_video: filePath,
        path_thumbnail: thumbFilePath,
      });
      // await newRef.set({ id: newRef.key });

      return console.log('Thumbnail URLs saved to database.');
    });


/*
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});
*/
