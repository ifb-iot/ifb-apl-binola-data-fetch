const mc = require('mcprotocol');
const conn = new mc;

const readData = (data) => {
	try {
		let conversion = (data.conversion.status === false || data.conversion.format === "decimal") ? 0 : data.conversion.format === "octal" ? 8 : 16;
		switch (data.datatype) {
			case "holdingRegister":
				return "D" + parseInt((+data.buffer + +data.address), conversion);
			case "discreteInputs":
				return "X" + parseInt((+data.buffer + +data.address), conversion);
			case "coil":
				return "M" + parseInt((+data.buffer + +data.address), conversion);
			default:
				break;
		}
	} catch (e) {
		console.log(e);
	}
};

const getModel = (data) => {
	for (let x = 0; x < data.length; x++) {
		const element = data[x];
		return readData(element);
	}
};

exports.processing = async (data, id) => {
	return new Promise((resolve, reject) => {
		let temp = id;

		const connected = () => {
			if (typeof (err) !== "undefined") {
				console.error(err);
				return reject()
			}
			const overallData = { "id": id.toString(), "timestamp": new Date() };
			for (const key in data.signals) {
				if (Object.hasOwnProperty.call(data.signals, key)) {
					const element = data.signals[key];
					if (element.status === true) {
						const dataArray = [];
						for (let x = 0; x < element.data.length; x++) {
							const item = element.data[x];
							conn.addItems(readData(item));
							if (item.label === null) {
								conn.addItems(getModel(element.types));
							}
							let validator = item?.validation?.status === true ? { "status": true, "compare": item?.validation?.compare } : false
							dataArray.push({ "label": item.label, "address": readData(item), "value": "", "model": item.label === null ? getModel(element.types) : null, "validator": validator });
						}
						overallData[key] = dataArray;
					}
				}
			}

			conn.readAllItems((err, values) => {
				if (err) {
					console.error('Error reading items from PLC:', err, data.headers.ip, +data.headers.port);
					conn.dropConnection();
					return reject()
				}
				for (const key in overallData) {
					if (Object.hasOwnProperty.call(overallData, key)) {
						const element = overallData[key];
						if (key !== 'id' && key !== 'timestamp') {
							element.forEach(item => {
								if (values[item.address] !== 'BAD 255') {
									if (item.validator === false) {
										item.value = values[item.address];
										item.label = item.label === null ? values[item.model] : item.label;
										temp += values[item.address];
										delete item.address;
										delete item.model;
										delete item.validator;
									} else {
										item.validator.compare = !Array.isArray(item.validator.compare) ? [item.validator.compare] : item.validator.compare
										if (item.validator.compare.includes(values[item.address])) {
											item.value = values[item.address];
											item.label = item.label === null ? values[item.model] : item.label;
											temp += values[item.address];
											delete item.address;
											delete item.model;
											delete item.validator;
										} else {
											conn.dropConnection();
											return reject()
										}
									}
								}
							});
						}
					}
				}
				if (temp !== "") {
					if (initalization[id.toString()] !== temp) {
						initalization[id.toString()] = temp;
						conn.dropConnection();
						return resolve(overallData);
					} else {
						conn.dropConnection();
						return reject()
					}
				} else {
					conn.dropConnection();
					return reject()
				}
			});
		};
		conn.initiateConnection({ port: +data.headers.port, host: data.headers.ip, ascii: false }, connected);
	});
};
