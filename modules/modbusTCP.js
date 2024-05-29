const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

const readData = async (data) => {
	try {
		await client.setID(1);
		let conversion = (data.conversion.status === false || data.conversion.format === "decimal") ? 0 : data.conversion.format === "octal" ? 8 : 16
		switch (data.datatype) {
			case "holdingRegister":
				let holdingRegister = await client.readHoldingRegisters(parseInt((+data.buffer + +data.address), conversion), 1)
				return holdingRegister.data[0]
			case "discreteInputs":
				let discreteInputs = await client.readDiscreteInputs(parseInt((+data.buffer + +data.address), conversion), 1)
				return discreteInputs.data[0]
			case "inputRegisters":
				let inputRegisters = await client.readInputRegisters(parseInt((+data.buffer + +data.address), conversion), 1)
				return inputRegisters.data[0]
			case "coil":
				let coil = await client.readCoils(parseInt((+data.buffer + +data.address), conversion), 1)
				return coil.data[0]
			default:
				break;
		}
	} catch (e) {
		console.log(e)
	}
}

exports.processing = async (data, id) => {
	let temp = ""
	await client.connectTCP(data.headers.ip, { port: +data.headers.port });
	await client.setID(1);

	const overallData = { "id": id.toString(), "timestamp": new Date() }
	for (const key in data.signals) {
		if (Object.hasOwnProperty.call(data.signals, key)) {
			const element = data.signals[key];
			if (element.status === true) {
				const dataArray = []
				for (let x = 0; x < element.data.length; x++) {
					const item = element.data[x];
					const value = await readData(item)
					console.log(value)
					dataArray.push({ "label": item.label === null ? null : item.label, "description": item.description === null ? null : item.description, "value": value })
					temp += value
				}
				overallData[key] = dataArray
			}
		}
	}
	await client.close()
	if (temp !== "") {
		if (global.modbusTCPValue !== temp) {
			global.modbusTCPValue = temp
			return (overallData)
		}
	}
}