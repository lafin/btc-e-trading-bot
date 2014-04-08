'use strict';

var BTCE = require('./btce'),
  config = require('./private'),
  mongoose = require('mongoose'),
  btce = new BTCE(config.key, config.secret),
  Record = null;

function init(callback) {
  mongoose.connect('mongodb://localhost:27017/watcher');
  Record = mongoose.model('values', mongoose.Schema({
    pair: String,
    date: Date,
    value: Number,
    data: String
  }));
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function () {
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
      for (var i in data) {
        if (data.hasOwnProperty(i)) {
          var record = new Record({
            pair: i,
            date: data[i].updated,
            value: data[i].last,
            data: data[i] * 1000
          });
          if (callback) {
            callback(record);
          }
        }
      }
    } else {
      console.log(err);
    }
  });
}

function run() {
  // get pairs list
  getPairs(function (pairs) {
    getData(pairs.join('-'));
  });
}

// init connect mongodb
init(run);