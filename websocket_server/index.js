const WebSocket = require('ws');
const sqlite3 = require('sqlite3');

let db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    //console.log('Connected to the ./chat.db SQlite database.');
});

 
var conId = 1;
const wss = new WebSocket.Server({port: 8080});
wss.on('connection', function handleConnection(ws) {
	ws.id = conId++;
	console.log('New connection, id: ' + ws.id);	
    ws.on('message', function handleMessage(message) {
		try {
			var jsonObj = JSON.parse(message);
			if (jsonObj.message === 'connect') {
				console.log('Client name: ' + jsonObj.data);
				db.run(`INSERT INTO user(id,name) VALUES(?,?)`, [ws.id,jsonObj.data], function(err) {
					if (err) {
						console.log('Unable to add client into the database!');
					}
				});
			} else if (jsonObj.message === 'chat') {
				//console.log('Client message: ' + jsonObj.data);
				db.get(`SELECT name FROM user WHERE id=?`, [ws.id], (err, row) => {
					if (err) {
						console.error(err.message);
					}
                    var d = new Date();
                    var t = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
					var chatMsg = row.name + ' @ ' + t + ': ' + jsonObj.data;
					//console.log('Chat message: ' + chatMsg);
					db.each(`SELECT id,name FROM user`, (err, row) => {
						if (err) {
							console.error(err.message);
						}
						//console.log(row.id + "\t" + row.name);
						wss.clients.forEach(function each(client) {
							if (row.id === client.id) {
								client.send(chatMsg);
							}
						});
					});					
				});
			} else {
				console.log('Unknown message from client: ' + message);
			}
		} catch(e) {
			console.log('Unable to parse message from client: ' + message);
		}
    });
    ws.on('close', function handleClose() {
        console.log('Client closed, id: ' + ws.id);
		db.get(`SELECT name FROM user WHERE id=?`, [ws.id], (err, row) => {
			if (err) {
				console.error(err.message);
			}
            var d = new Date();
            var t = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
		    var chatMsg = t + ': ' + row.name + ' disconnected';	
			db.run(`DELETE FROM user WHERE id=?`, [ws.id], function(err) {
				if (err) {
					console.log('Unable to delete client from the database!');
				}
			});
			db.each(`SELECT id,name FROM user`, (err, row) => {
				if (err) {
					console.error(err.message);
				}
				//console.log(row.id + "\t" + row.name);
				wss.clients.forEach(function each(client) {
					if (row.id === client.id) {
						client.send(chatMsg);
					}
				});
			});					
		});
    });
});

console.log('Chat server started ...');
