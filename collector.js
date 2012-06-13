#!/usr/bin/env node

const crypto = require('crypto'),
      http = require('http'),
      https = require('https'),
      fs = require('fs'),
      util = require('util'),
      url = require('url'),
      exec = require('child_process').exec,
//    mdns = require('mdns'),
      sqlite3 = require('sqlite3').verbose();
      db = new sqlite3.Database('/var/lib/wattsapp/collector.sqlite');

function handle_list(res, query) {
  result = [];

  db.each('SELECT * FROM sensors', function(err, row) {
    if (err) throw err;
    result.push({
      'id': row['id'],
      'name': row['name'],
      'status': row['status'] == 0 ? "inactive" : "active",
      'type': row['type'],
      'unit': row['unit'],
      'location': row['lat']+','+row['lon']
    });
  },
  function() {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(result));
  });
}

function handle_details(res, query) {
  function foreach_value_row(err, row) {
    if (err) throw err;
    result[row['id']]['values'].push({
      'begin': row['begin'],
      'end': row['end'],
      'value': row['value'],
    });
  };

  function foreach_value_complete() {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(result));
  }

  function foreach_sensors_row(err, row) {
    if (err) throw err;
    result[row['id']] = {
      'name': row['name'],
      'status': row['status'] == 0 ? 'inactive' : 'active',
      'type': row['type'],
      'unit': row['unit'],
      'location': row['lat']+","+row['lon'],
      'values': []
    }
  }

  function foreach_sensors_complete() {
      var values_query = "SELECT * FROM value";
      var values_param = [];
      var begin_time = null;
      var end_time = null;

      if (query['meters'] || query['time']) {
        values_query += " WHERE";
      }

      if (query['meters']) {
        var sensors = query['meters'].split(',');
        values_query += " id IN (";
        values_query += sensors.map(function(e) { return "?" }).join(',');
        values_query += ")";
        values_param = values_param.concat(sensors);
      }

      if (query['meters'] && query['time']) {
        values_query += " AND";
      }

      if (query['time']) {
        var time = query['time'].split(':')
        time_begin = time[0];
        time_end = time[1];

        if (time_begin > 0 && time_end > 0) {
          values_query += " begin > ? AND end < ?";
          values_param = values_param.concat([time_begin, time_end]);
        } else if (time_begin > 0) {
          values_query += " begin > ?";
          values_param = values_param.concat([time_begin]);
        } else if (time_end > 0) {
          values_query += " end < ?";
          values_param = values_param.concat([time_end]);
        }
      }

      db.each(values_query, values_param, foreach_value_row, foreach_value_complete);
  }

  result = {};

  var sensors_query = "SELECT * FROM sensors";
  var sensors = [];

  if (query['meters']) {
    var sensors = query['meters'].split(',');
    sensors_query += " WHERE id IN (";
    sensors_query += sensors.map(function(e) { return "?" }).join(',');
    sensors_query += ")"
  }

  db.each(sensors_query, sensors, foreach_sensors_row, foreach_sensors_complete);
}

function handle_sum(res, query) {
  function foreach_value_row(err, row) {
    if (err) throw err;
    result[row['id']]['values'].push({
      'begin': row['begin'],
      'end': row['end'],
      'value': row['value'],
    });
  };

  function foreach_value_complete() {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(result));
  }

  function foreach_sensors_row(err, row) {
    if (err) throw err;
    result[row['id']] = {
      'name': row['name'],
      'status': row['status'] == 0 ? 'inactive' : 'active',
      'type': row['type'],
      'unit': row['unit'],
      'location': row['lat']+","+row['lon'],
      'values': []
    }
  }

  function foreach_sensors_complete() {
    var values_query = "SELECT id, MIN(begin) AS begin, MAX(end) AS end, SUM(value) AS value FROM value";
      var values_param = [];
      var begin_time = null;
      var end_time = null;

      if (query['meters'] || query['time']) {
        values_query += " WHERE";
      }

      if (query['meters']) {
        var sensors = query['meters'].split(',');
        values_query += " id IN (";
        values_query += sensors.map(function(e) { return "?" }).join(',');
        values_query += ")";
        values_param = values_param.concat(sensors);
      }

      if (query['meters'] && query['time']) {
        values_query += " AND";
      }

      if (query['time']) {
        var time = query['time'].split(':')
        time_begin = time[0];
        time_end = time[1];

        if (time_begin > 0 && time_end > 0) {
          values_query += " begin > ? AND end < ?";
          values_param = values_param.concat([time_begin, time_end]);
        } else if (time_begin > 0) {
          values_query += " begin > ?";
          values_param = values_param.concat([time_begin]);
        } else if (time_end > 0) {
          values_query += " end < ?";
          values_param = values_param.concat([time_end]);
        }
      }

      values_query += " GROUP BY id";

      db.each(values_query, values_param, foreach_value_row, foreach_value_complete);
  }

  result = {};

  var sensors_query = "SELECT * FROM sensors";
  var sensors = [];

  if (query['meters']) {
    var sensors = query['meters'].split(',');
    sensors_query += " WHERE id IN (";
    sensors_query += sensors.map(function(e) { return "?" }).join(',');
    sensors_query += ")"
  }

  db.each(sensors_query, sensors, foreach_sensors_row, foreach_sensors_complete);
}

function handle_blacklist(res, query) {
  var blacklist_query = "UPDATE sensors SET status=0 WHERE id=?";

  if (!query['sensor']) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify([]));
    return;
  }

  db.run(blacklist_query, query['sensor'], function(err) {
    if (err) throw err;

    var result_query = "SELECT * FROM sensors WHERE id=?";

    db.get(result_query, query['sensor'], function(err, row) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(row));
    });
  });
}

function handle_unblacklist(res, query) {
  var blacklist_query = "UPDATE sensors SET status=1 WHERE id=?";

  if (!query['sensor']) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify([]));
    return;
  }

  db.run(blacklist_query, query['sensor'], function(err) {
    if (err) throw err;

    var result_query = "SELECT * FROM sensors WHERE id=?";

    db.get(result_query, query['sensor'], function(err, row) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(row));
    });
  });
}

function handle_rename(res, query) {
  var rename_query = "UPDATE sensors SET name=? WHERE id=?";

  if (!query['sensor'] || !query['name']) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify([]));
    return;
  }

  db.run(rename_query, query['name'], query['sensor'], function(err) {
    if (err) throw err;

    var result_query = "SELECT * FROM sensors WHERE id=?";

    db.get(result_query, query['sensor'], function(err, row) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(row));
    });
  });
}

function handle_relocate(res, query) {
  var rename_query = "UPDATE sensors SET lat=?, lon=? WHERE id=?";

  if (!query['sensor'] || !query['location']) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify([]));
    return;
  }

  var loc = query['location'].split(',');

  if (!loc[0] || !loc[1]) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify([]));
    return;
  }

  db.run(rename_query, loc[0], loc[1], query['sensor'], function(err) {
    if (err) throw err;

    var result_query = "SELECT * FROM sensors WHERE id=?";

    db.get(result_query, query['sensor'], function(err, row) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(row));
    });
  });
}

function request_handler(req, res) {
    if (!req.connection.authorized) {
      res.writeHead(403, {'Content-Type': 'text/plain'});
      res.end("invalid ssl client certificate");
      return;
    }

    parsed = url.parse(req.url, true);

    methods = {
      '/list': handle_list,
      '/details': handle_details,
      '/sum': handle_sum,
      '/blacklist': handle_blacklist,
      '/unblacklist': handle_unblacklist,
      '/rename': handle_rename,
      '/relocate': handle_relocate
    }

    console.log(req.url);

    if (parsed['pathname'] in methods) {
      methods[parsed['pathname']](res, parsed['query'])
    } else {
      res.writeHead(501, {'Content-Type': 'application/json'});
      res.end("")
    }
};

/*
function poll_sensors() {
  fs.readFile('sensors.json', 'utf8', function (err, data) {
    data = JSON.parse(data);

    for (hosts in data) {
      var options = {
        host: hosts['host'],
        port: hosts['port'],
        path: '/details',
        method: 'GET'
      }

      var request = http.request(options);

      request.on('response', function (res) {
        console.log("success");
      });

      request.on('error', function(e) {
        console.log(e.message);
      });

      request.end();
    }
  });
}

setInterval(poll_sensors, 1000*3600); // once per hour
*/

/*
mdns.createAdvertisement('https', 8443).start();
*/

/*
child = exec("avahi-publish-service collector _https._tcp 8443 \"ns=wattsapp;ip=2001:638:709:5::5\"", function(error, stdout, stderr) {});
*/

var options = {
    key: fs.readFileSync('/var/lib/wattsapp/collector.key'),
    cert: fs.readFileSync('/var/lib/wattsapp/collector.crt'),
    ca: fs.readdirSync('/var/lib/wattsapp/collector_clients').map(function(x) {
      return fs.readFileSync('/var/lib/wattsapp/collector_clients/'+x);
    }),
    requestCert: true,
//  rejectUnauthorized: true
};

var server = https.createServer(options);
server.addListener("request", request_handler);
server.listen(8443);
