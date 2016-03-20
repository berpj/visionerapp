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
    $('#title').css('bottom', '155px');
    $('#format').show();
    $('#example').show();
    $('#submit').show();

    $('#title').text('Rename into');

    return false;
  };

  var progress = 0.;
  var count = 0;
  const BrowserWindow = require('electron').remote.BrowserWindow;
  var win = new BrowserWindow({ width: 800, height: 600, show: false });

  var start = 0;

  $('#format input').bind('input', function(e) {
    var output = $('#format input').val();

    output = output.replace('locality', 'sydney');
    output = output.replace('country', 'australia');
    output = output.replace('date', '06_21_2016');
    output = output.replace('label', 'beach');

    $('#example #output-example').text(output);
  })

  $('#submit input').click(function (e) {
    e.preventDefault();

    progress = 0.;
    count = 0;

    $('#format').hide();
    $('#example').hide();
    $('#submit').hide();
    $('#title').text('Renaming your pictures...');
    $('#progress').text(progress + '%');
    win.setProgressBar(progress);
    $('#progress').show();


    var format = $('#format input').val();

    ipcRenderer.send('asynchronous-message', format, files);
    start = new Date().getTime();

    return false;
  });

  ipcRenderer.on('asynchronous-reply', function(event, arg) {
    count++;
    progress = Math.ceil(count / files.length * 100.);
    $('#progress').text(progress + '%');
    win.setProgressBar(progress / 100);

    if (progress == 100 ) {
      $('#title').text('Renaming finished!');
      new Notification('Visioner', { body: 'Renaming finished! (' + files.length + ' pictures in ' + Math.round((new Date().getTime() - start) / 1000) + 's)' });
      files = [];
      start = 0;

      setTimeout(function(){
        $('body').css('background-color', '#2980b9');
        $('#count').hide();
        $('#format').hide();
        $('#submit').hide();
        $('#title').text('Drop your pictures here');
        $('#progress').hide();
        win.setProgressBar(-1);
      }, 2500);

    } else {

    }
  });
});
