Dropzone.options.mydropzone = {
  paramName: 'file', // The name that will be used to transfer the file
  maxFilesize: 10000, // MB
  init: function () {
    // Set up any event handlers
    this.on('completemultiple', function () {
      location.reload();
    });
  }
};
