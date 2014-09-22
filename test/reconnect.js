var test = require('tape');
var quickconnect = require('..');
var connections = [];
var dcs = [];
var room = require('uuid').v4();
var signallingServer = location.origin;

// require('cog/logger').enable('*');

test('create connector 0', function(t) {
  t.plan(3);
  t.ok(connections[0] = quickconnect(signallingServer, {
    room: room
  }), 'created');

  t.equal(typeof connections[0].createDataChannel, 'function', 'has a createDataChannel function');

  // create the data channel
  connections[0].createDataChannel('test');
  setTimeout(t.pass.bind(t, 'dc created'), 500);
});

test('create connector 1', function(t) {
  t.plan(3);
  t.ok(connections[1] = quickconnect(signallingServer, {
    room: room
  }), 'created');

  t.equal(typeof connections[1].createDataChannel, 'function', 'has a createDataChannel function');

  // create the data channel
  connections[1].createDataChannel('test');
  setTimeout(t.pass.bind(t, 'dc created'), 500);
});

test('check call active', function(t) {
  t.plan(connections.length * 3);

  connections.forEach(function(conn, index) {
    conn.waitForCall(connections[index ^ 1].id, function(err, pc) {
      t.ifError(err, 'call available');
      t.ok(pc, 'have peer connection');

      // check connection state valid
      t.ok(['connected', 'completed'].indexOf(pc.iceConnectionState) >= 0, 'call connected');
    });
  });
});

test('data channels opened', function(t) {
  t.plan(4);
  connections[0].requestChannel(connections[1].id, 'test', function(err, dc) {
    t.ifError(err);
    dcs[0] = dc;
    t.equal(dc.readyState, 'open', 'connection test dc 0 open');
  });

  connections[1].requestChannel(connections[0].id, 'test', function(err, dc) {
    t.ifError(err);
    dcs[1] = dc;
    t.equal(dc.readyState, 'open', 'connection test dc 1 open');
  });
});

test('dc 0 send', function(t) {
  dcs[1].onmessage = function(evt) {
    t.equal(evt.data, 'hi', 'dc:1 received hi');
    dcs[1].onmessage = null;
  };

  t.plan(1);
  dcs[0].send('hi');
});

test('dc 1 send', function(t) {
  dcs[0].onmessage = function(evt) {
    t.equal(evt.data, 'hi', 'dc:1 received hi');
    dcs[0].onmessage = null;
  };

  t.plan(1);
  dcs[1].send('hi');
});

test('end calls on connection 0 and wait for dc close notifications', function(t) {
  var timer = setTimeout(t.fail.bind(t, 'timed out'), 45000);
  var closedCount = 0;

  function handleClose(peerId, datachannel, label) {
    t.equal(label, 'test', 'label == test');
    t.ok(datachannel.readyState, '2nd arg is a data channel');
    t.equal(typeof peerId, 'string', '1st args is a string');

    closedCount += 1;
    if (closedCount === 4) {
      clearTimeout(timer);
    }
  }

  t.plan(12);
  connections.forEach(function(conn, idx) {
    conn.once('channel:closed', handleClose);
    conn.once('channel:closed:test', handleClose);
  });

  connections[0].endCalls();
});

test('announce connection:0 in empty room (leave room)', function(t) {
  t.plan(2);

  connections[0].once('local:announce', function(data) {
    t.equal(data.room, '', 'announcing with empty room');
  });

  connections[1].once('peer:leave', function(id) {
    t.equal(id, connections[0].id, 'connection:1 received peer:leave for connection:0');
  });

  connections[0].announce({ room: '' });
});

test('announce connection:0 in original room', function(t) {
  t.plan(3);

  connections[0].once('local:announce', function(data) {
    t.equal(data.room, room, 'announcing in original room');
  });

  connections[1].once('peer:announce', function(data) {
    t.equal(data.id, connections[0].id, 'connection:1 receiver peer:announce for connection:0');
    t.equal(data.room, room, 'room is as expected');
  });

  connections[0].announce({ room: room });
});


test('check call active', function(t) {
  t.plan(connections.length * 3);

  connections.forEach(function(conn, index) {
    conn.waitForCall(connections[index ^ 1].id, function(err, pc) {
      t.ifError(err, 'call available');
      t.ok(pc, 'have peer connection');

      // check connection state valid
      t.ok(['connected', 'completed'].indexOf(pc.iceConnectionState) >= 0, 'call connected');
    });
  });
});

test('release references', function(t) {
  t.plan(1);

  connections[1].close();
  connections = [];
  dcs = [];

  t.pass('done');
});