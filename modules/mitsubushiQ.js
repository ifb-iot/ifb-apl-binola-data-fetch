var mc = require('mcprotocol');
var conn = new mc;

conn.initiateConnection({ port: 4000, host: '10.0.11.141', ascii: false }, connected);

function connected(err) {
	if (typeof (err) !== "undefined") {
		console.log(err);
		process.exit();
	}
	conn.addItems('D300'); // Vertical Runnout
	conn.addItems('M0'); // Horizontal Runnout
	conn.addItems('M1'); // Models Selection
	// conn.addItems('M117'); // Stop Bit
	// conn.addItems('M118'); // Stop Bit
	// conn.addItems('M119'); // Stop Bit
	// conn.addItems('X10'); // Stop Bit
	// conn.addItems('X11'); // Stop Bit
	// conn.addItems('X16'); // Stop Bit
	// conn.addItems('X17'); // Stop Bit
	conn.addItems('M3'); // Down Signal
	conn.readAllItems(valuesReady);
}

function valuesReady(anythingBad, values) {
	if (anythingBad) { console.log("SOMETHING WENT WRONG READING VALUES!!!!"); }
	console.log(values);
}

exports.processing = async (data, id) => {
	conn.initiateConnection({ port: 1025, host: '192.168.3.10', ascii: false }, connected);
}