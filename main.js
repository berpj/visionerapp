'use strict';

function get_gps_coordinates (data_latitude, data_longitude) {
  var latitude = 0;
  var longitude = 0;

  latitude = data_latitude[0] + (data_latitude[1] / 60) + (data_latitude[2] / 3600);
  longitude = data_longitude[0] + (data_longitude[1] / 60) + (data_longitude[2] / 3600);

  return [latitude, longitude]
}

function get_country (format, exifData, callback) {
  var request = require("request");

  if (!format.includes('country')) {
    callback(null, 'unknown');
  }

  try {
    var coordinates = get_gps_coordinates(exifData.gps.GPSLatitude, exifData.gps.GPSLongitude);

    request.get({
      url: 'http://api.visionerapp.com/v1/geocode?latitude=' + coordinates[0] + '&longitude=' + coordinates[1], json: true, headers: {"Authorization": "Token token=wNrbKvRUrHRoXGs5IqUSuwtt"}
    }, function (error, response, data) {
      callback(null, data['country'].replace(/ /g,"_").toLowerCase());
    });

  }
  catch (error) {
    callback(null, 'unknown');
  }
}

function get_locality (format, exifData, callback) {
  var request = require("request");

  if (!format.includes('locality')) {
    callback(null, 'unknown');
    return true;
  }

  try {
    var coordinates = get_gps_coordinates(exifData.gps.GPSLatitude, exifData.gps.GPSLongitude);

    request.get({
      url: 'http://api.visionerapp.com/v1/geocode?latitude=' + coordinates[0] + '&longitude=' + coordinates[1], json: true, headers: {"Authorization": "Token token=wNrbKvRUrHRoXGs5IqUSuwtt"}
    }, function (error, response, data) {
      callback(null, data['locality'].replace(/ /g,"_").toLowerCase());
    });
  }
  catch (error) {
    callback(null, 'unknown');
  }
}

function get_date (format, exifData, callback) {
  var moment = require('moment');

  if (!format.includes('date')) {
    callback(null, 'unknown');
  }

  try {
    callback(null, moment(exifData.exif.DateTimeOriginal, 'YYYY:MM:DD HH:mm:ss').format('DD_MM_YYYY'));
  }
  catch (error) {
    callback(null, 'unknown');
  }
}

function get_label (format, old_full_path, callback) {
  var fs = require('fs');
  var request = require("request");
  var lwip = require('lwip');

  if (!format.includes('label')) {
    callback(null, 'unknown');
    return true;
  }

  try {
    lwip.open(old_full_path, function (err, image) {
      image.resize(640, 480, function (err, image) {
        image.toBuffer('jpg', function(err, buffer) {
          var formData = {
            data: buffer.toString('base64')
          };
          request.post({url: 'http://api.visionerapp.com/v1/label', formData: formData, json: true, headers: {"Authorization": "Token token=wNrbKvRUrHRoXGs5IqUSuwtt"}}, function (error, response, data) {
            callback(null, data['label'].replace(/ /g,"_").toLowerCase());
          });
        });
      });
    });
  }
  catch (error) {
    callback(null, 'unknown');
  }
}

function fileExists(filePath)
{
  var fs = require('fs');
    try
    {
        return fs.statSync(filePath).isFile();
    }
    catch (err)
    {
        return false;
    }
}

function rename_file (error, results, format, old_full_path, callback_ipc, main_callback) {
  var path = require('path');
  var fs = require('fs');

  var extname = path.extname(old_full_path).toLowerCase();
  var dir = path.dirname(old_full_path) + path.sep;
  var old_filename = path.basename(old_full_path).toLowerCase();
  var new_filename = format.toLowerCase();

  new_filename = new_filename.replace('country', results[0]);
  new_filename = new_filename.replace('locality', results[1]);
  new_filename = new_filename.replace('date', results[2]);
  new_filename = new_filename.replace('label', results[3]);

  var new_basename = path.basename(new_filename, '.jpg').toLowerCase();

  //console.log(old_full_path);

  var count = '';
  while (fileExists(dir + new_basename + count + '.jpg') && old_full_path != dir + new_basename + count + '.jpg') {
    if (count == '') {
      count = 2
    } else {
      count++;
    }
  }

  fs.rename(old_full_path, dir + new_basename + count + '.jpg');

  callback_ipc();
  main_callback(null, 'done');
}

function process_file (old_full_path, format, sender, main_callback) {
  var path = require('path');
  var mime = require('mime');
  var extname = path.extname(old_full_path).toLowerCase();

  if (extname != '.jpg' || mime.lookup(old_full_path) != 'image/jpeg')
  {
    //dialog.showErrorBox('Error: Visioner can\'t read the file', 'Make sure you only use jpg files.');
    sender.send('asynchronous-reply', 'done');
    main_callback(null, 'done');
    return;
  }

  var ExifImage = require('exif').ExifImage;
  var async = require('async');

  var callback_ipc = function () { sender.send('asynchronous-reply', 'done'); };

  require('exif').ExifImage({ image : old_full_path }, function (error, exifData) {
    async.parallel([
      function(callback) { get_country(format, exifData, callback) },
      function(callback) { get_locality(format, exifData, callback) },
      function(callback) { get_date(format, exifData, callback) },
      function(callback) { get_label(format, old_full_path, callback) }
    ], function(error, results) { rename_file(error, results, format, old_full_path, callback_ipc, main_callback) });
  });
}

const electron = require('electron');
const dialog = require('electron').dialog;

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  var async = require('async');
  const ipcMain = require('electron').ipcMain;

  mainWindow = new BrowserWindow({width: 600, height: 530, resizable: false});

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  ipcMain.on('asynchronous-message', function(event, format, files) {
    async.eachLimit(files, 4, function(file, main_callback) { process_file(file, format, event.sender, main_callback); });
  });

  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
