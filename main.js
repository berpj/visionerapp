'use strict';

function get_gps_coordinates (data_latitude, data_longitude) {
  var latitude = 0;
  var longitude = 0;

  latitude = data_latitude[0] + (data_latitude[1] / 60) + (data_latitude[2] / 3600);
  longitude = data_longitude[0] + (data_longitude[1] / 60) + (data_longitude[2] / 3600);

  return [latitude, longitude]
}

function get_country (format, exifData, callback) {
  if (!format.includes('country')) {
    callback(null, 'unknown');
  }

  var request = require("request");

  try {
    var coordinates = get_gps_coordinates(exifData.gps.GPSLatitude, exifData.gps.GPSLongitude);

    request({
      url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + coordinates[0].toString() + ',' + coordinates[1].toString(), json: true
    }, function (error, response, data) {
      callback(null, data.results.filter(function(place) { return place['types'][0] == 'country' })[0].address_components[0].long_name);
    });
  }
  catch (error) {
    callback(null, 'unknown');
  }
}

function get_locality (format, exifData, callback) {
  if (!format.includes('locality')) {
    callback(null, 'unknown');
    return true;
  }

  var request = require("request");

  try {
    var coordinates = get_gps_coordinates(exifData.gps.GPSLatitude, exifData.gps.GPSLongitude);

    request({
      url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + coordinates[0].toString() + ',' + coordinates[1].toString(), json: true
    }, function (error, response, data) {
      callback(null, data.results.filter(function(place) { return place['types'][0] == 'locality' })[0].address_components[0].long_name);

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

  if (!format.includes('label')) {
    callback(null, 'unknown');
    return true;
  }

  /*
  image = MiniMagick::Image.open(image_name)

  # Resize image
  image.resize "640x" + image.height.to_s if image.width > 640
  image.resize image.width.to_s + "x480" if image.height > 480

  # Convert image to Base 64
  b64_data = Base64.encode64(image.to_blob)
  */



  var im = require('imagemagick');




  var request = require("request");

  try {
    require('lwip').open(old_full_path, function (err, image) {
      image.resize(640, 480, function (err, image) {
        image.toBuffer('jpg', function(err, buffer) {
          var formData = {
            data: buffer.toString('base64')
          };
          request.post({url: 'http://vision.bergeron.io/api/v1/label', formData: formData, json: true, headers: {"Authorization": "Token token=wNrbKvRUrHRoXGs5IqUSuwtt"}}, function (error, response, data) {
            callback(null, data['label']);
          });
        });

      });
    });
  }
  catch (error) {
    callback(null, 'unknown');
  }
}

function rename_file (error, results, format, old_full_path, callback_ipc) {
  var path = require('path');
  var fs = require('fs');

  var extname = path.extname(old_full_path).toLowerCase();
  var dir = path.dirname(old_full_path) + '/';
  var old_filename = path.basename(old_full_path).toLowerCase();
  var new_filename = format.toLowerCase();

  new_filename = new_filename.replace('country', results[0]);
  new_filename = new_filename.replace('locality', results[1]);
  new_filename = new_filename.replace('date', results[2]);
  new_filename = new_filename.replace('label', results[3]);

  var new_basename = path.basename(new_filename, '.jpg').toLowerCase();

  fs.rename(old_full_path, dir + new_basename + '' + '.jpg');

  callback_ipc();
}

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  const ipcMain = require('electron').ipcMain;
  var async = require("async");
  var ExifImage = require('exif').ExifImage;

  mainWindow = new BrowserWindow({width: 600, height: 530, resizable: false});

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  ipcMain.on('asynchronous-message', function(event, format, files) {
    for (var i = 0, len = files.length; i < len; i++) {

      var callback_ipc = function () { event.sender.send('asynchronous-reply', 'done'); };

      var old_full_path = files[i];

      new ExifImage({ image : files[i] }, function (error, exifData) {

        async.parallel([
          function(callback) { get_country(format, exifData, callback) },
          function(callback) { get_locality(format, exifData, callback) },
          function(callback) { get_date(format, exifData, callback) },
          function(callback) { get_label(format, old_full_path, callback) }
        ], function(error, results) { rename_file(error, results, format, old_full_path, callback_ipc) });

      });
    }
  });

  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function() {
    mainWindow = null;
    app.quit();
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
