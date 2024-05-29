const net = require('net');

exports.processing = async (data, id) => {
	let temp = id;

	const overallData = { "id": id.toString(), "timestamp": new Date() }
	const socket = new net.Socket();

	socket.connect(+data.headers.port, data.headers.ip, () => {
		console.log(`CONNECTED | ${data.headers.ip}:${+data.headers.port}`);
	});

	const receiveData = new Promise((resolve) => {
		socket.on('data', (serial) => {
			for (const key in data.signals) {
				if (Object.hasOwnProperty.call(data.signals, key)) {
					const element = data.signals[key];
					if (element.status === true) {
						temp += serial.toString()
						overallData[Object.keys(data.signals)[0]] = serial.toString().replace(/\r\n/g, "")
						socket.end();
						break;
					}
				}
			}
			return resolve(overallData);
		});
	});

	socket.on('error', () => {
		socket.end();
	});

	socket.on('close', () => {
		socket.end();
	});

	const telnetResponse = new Promise((resolve, reject) => {
		setTimeout(async () => {
			const serialData = await receiveData
			if (serialData) {
				if (temp !== "") {
					if (initalization[id.toString()] !== temp) {
						initalization[id.toString()] = temp
						socket.end();
						return resolve(overallData)
					} else {
						socket.end();
						return reject()
					}
				} else {
					socket.end();
					return reject()
				}
			} else {
				socket.end();
				return reject()
			}
		}, 40);
	})
	const response = await telnetResponse
	return (response)
}
