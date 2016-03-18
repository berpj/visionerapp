window.$ = window.jQuery = require('./js/jquery-2.2.1.min.js');

$( document ).ready(function() {
  var dropzone = $('body')[0];
  dropzone.ondragover = function () {
    $('body').css('background-color', '#8e44ad');
    return false;
  };
  dropzone.ondragleave = dropzone.ondragend = function () {
    $('body').css('background-color', '#2980b9');
    return false;
  };

  const ipcRenderer = require('electron').ipcRenderer;

  var files = []

  dropzone.ondrop = function (e) {
    e.preventDefault();

    files = []
    $.each(e.dataTransfer.files, function(index, file) {
      files.push(file.path)
    });

    $('#count').html(files.length + ' added')
    $('#count').show();
    $('#format').show();
    $('#submit').show();

    $('#title').text('Rename into');

    return false;
  };

  var progress = 0.;
  var count = 0;

  $('#submit input').click(function (e) {
    e.preventDefault();

    progress = 0.;
    count = 0;

    $('#format').hide();
    $('#submit').hide();
    $('#title').text('Renaming your pictures...');
    $('#progress').text(progress + '%');
    $('#progress').show();

    var format = $('#format input').val();

    ipcRenderer.send('asynchronous-message', format, files);

    return false;
  });

  ipcRenderer.on('asynchronous-reply', function(event, arg) {
    count++;
    progress = Math.ceil(count / files.length * 100.);
    $('#progress').text(progress + '%');

    if (progress == 100 ) {
      new Notification('Visioner', { body: 'Task finished!' });

      files = [];
      $('body').css('background-color', '#2980b9');
      $('#count').hide();
      $('#format').hide();
      $('#submit').hide();
      $('#title').text('Drop your pictures here');
      $('#progress').hide();
    } else {

    }
  });
});
