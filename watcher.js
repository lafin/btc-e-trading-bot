'use strict';

var BTCE = require('./btce'),
  config = require('./private'),
  mongoose = require('mongoose'),
  btce = new BTCE(config.key, config.secret),
  recordModel = null;

function init(callback) {
  mongoose.connect('mongodb://localhost:27017/watcher');
  recordModel = mongoose.model('values', mongoose.Schema({
    pair: String,
    date: Date,
    value: Number,
    data: String
  }));
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function () {
    console.log('connect to mongodb');
    callback();
  });
}

function getPairs(callback) {
  var pairs = [],
    pairsArr;
  btce.info(function (err, data) {
    if (!err) {
      pairsArr = data.pairs;
      for (var i in pairsArr) {
        if (pairsArr.hasOwnProperty(i) && pairsArr[i].hidden === 0) {
          pairs.push(i);
        }
      }
      callback(pairs);
    } else {
      console.log(err);
    }
  });
}

function getData(pair, callback) {
  btce.ticker({
    pair: pair,
    ver: 3
  }, function (err, data) {
    if (!err) {
      if (callback) {
        callback(data);
      }
    } else {
      console.log(err);
    }
  });
}

function saveData(pairs, callback) {
  pairs = pairs.join('-');
  getData(pairs, function (data) {
    for (var i in data) {
      if (data.hasOwnProperty(i)) {
        var record = new recordModel({
          pair: i,
          date: data[i].updated * 1000,
          value: data[i].last,
          data: JSON.stringify(data[i])
        });
        record.save(function (err) {
          if (err) {
            console.log('error');
          }
        });
      }
    }
    callback();
  });
}

function run(pairs) {
  console.log('start watcher');
  var reciveData = false,
    recivingData = false;
  setInterval(function () {
    if (reciveData) {
      reciveData = false;
    }
    if (recivingData === false) {
      recivingData = true;
      saveData(pairs, function () {
        reciveData = true;
        recivingData = false;
        console.log('next iteration');
      });
    }
  }, 500);
}

function preload() {
  // get pairs list
  console.log('preload data');
  getPairs(function (pairs) {
    run(pairs);
  });
}

// init connect mongodb
init(preload);