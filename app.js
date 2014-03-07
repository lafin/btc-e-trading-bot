var BTCE = require('./btce'),
  config = require('./private'),
  btce = new BTCE(config.key, config.secret);

var pair = 'ltc_usd',
  fee = 0;

function roundMod(value, precision) {
  var precisionNumber = Math.pow(10, precision);
  return Math.round(value * precisionNumber) / precisionNumber;
}

function cancelOrder(order_id) {
  btce.cancelOrder({
    order_id: order_id
  }, function(err) {
    if (err) {
      throw err;
    }
    console.log('cancel order:', order_id);
  });
}

function addOrder(type) {
  type = type || 'buy';
  var rate, amount;
  btce.ticker({
    pair: pair
  }, function(err, data) {
    if (err) {
      throw err;
    }
    var top = data.ticker.high,
      bottom = data.ticker.low,
      diff = (top - bottom) * 0.25;
    top = top - diff; // -25%
    bottom = bottom + diff; // +25%
    btce.getInfo(function(err, data) {
      if (err) {
        throw err;
      }
      var params = pair.split('_');
      var coin = data.funds[params[0]],
        cash = data.funds[params[1]];

      type = coin < 0.1 ? 'buy' : 'sell';
      rate = type === 'buy' ? bottom : top;
      amount = type === 'buy' ? cash / rate : coin;
      amount = roundMod(amount - amount / 100 * fee, 5);
      rate = roundMod(rate, 5);

      btce.trade({
        pair: pair,
        type: type,
        rate: rate,
        amount: amount
      }, function(err, data) {
        if (err) {
          throw err;
        }
        console.log('add order:', data.order_id);
      });
    });

  });
}

function checkOrders() {
  btce.activeOrders({
    pair: pair
  }, function(err, orders) {
    if (err) {
      throw err;
    }
    var currentTime = (new Date()).valueOf() / 1000 | 0;
    for (var i in orders) {
      if (orders.hasOwnProperty(i)) {
        var order_id = i;
        if ((currentTime - orders[i].timestamp_created) > 43200) {
          var type = orders[i].type;
          cancelOrder(order_id);
          addOrder(type);
        }
      }
    }
  });
}

btce.fee({
  pair: pair
}, function(err, data) {
  if (err) {
    throw err;
  }
  fee = data.trade;
  setInterval(function() {
    checkOrders();
  }, 5000);
});