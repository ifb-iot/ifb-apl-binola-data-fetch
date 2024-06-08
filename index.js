const { MongoClient } = require('mongodb');
const ping = require('ping')
require('dotenv').config()
/**
 * CONNECT PLC AND FETCH DATA
 */
const modbusTCP = require('./modules/modbusTCP')
const modbusTCPIncident = require('./modules/modbusTCPIncident')
const MCProtocol = require('./modules/MCProtocol')
const MSAccess = require('./modules/MSAccess')
const modbusRTU = require('./modules/modbusRTU')
// const mitsubushiQ = require('./modules/mitsubushiQ')
/**
 * CONNECT SCANNER AND FETCH DATA
 */
const telnet = require('./modules/telnet')
/**
 * SAVE DATA
 */
const dataSave = require('./modules/dataSave')

const client = new MongoClient(process.env.DB_URL);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const executePing = async (host) => {
	return new Promise((resolve) => {
		ping.sys.probe(host, async function (status) {
			return resolve(status)
		})
	})
}

const processInit = (data, signals) => {
	const lastStateFlag = {}
	data.forEach(records => {
		const exceptions = Object.keys(signals[records.latestRecord.id]).filter(key => signals[records.latestRecord.id][key].status === true);
		let temp = records.latestRecord.id
		for (const key in records.latestRecord) {
			if (Object.hasOwnProperty.call(records.latestRecord, key)) {
				const element = records.latestRecord[key];
				if (exceptions.includes(key)) {
					if (typeof element === "object") {
						element.forEach(item => {
							if (item.value !== null) {
								temp += item.value.toString()
							}
						});
					} else {
						temp += element.toString()
					}
				}
			}
		}
		lastStateFlag[records.latestRecord.id] = temp
	});
	return lastStateFlag
}

async function connectToMongoDB() {
	try {
		await client.connect();
		const db = client.db(process.env.DB_NAME);
		const dataConfig = await db.collection('config').find({ "status": true }).toArray();
		const idArray = dataConfig.map(item => item._id.toString());

		const signalObject = dataConfig.reduce((acc, item) => {
			acc[item._id] = item.parameters?.signals;
			return acc;
		}, {});

		const initalizationValues = await db.collection('raw-data').aggregate([
			{ $match: { id: { $in: idArray } } },
			{ $sort: { 'timestamp': -1 } }, // Sort by timestamp in descending order
			{
				$group: {
					_id: "$id", // Group by id
					latestRecord: { $first: "$$ROOT" } // Get the first document in each group (latest based on timestamp)
				}
			}
		]).toArray();

		if (dataConfig.length > 0) {
			const initalization = processInit(initalizationValues, signalObject)
			global.initalization = initalization
			const getParameters1 = async () => {
				for (const iterator of dataConfig) {
					try {
						switch (iterator.parameters.protocol) {
							case "modbus-tcp-incident":
								console.log(iterator.machine.make, iterator.machine.model, "|", iterator.parameters.headers.ip, "| READING | ", new Date())
								const pingModbusTCPIncident = await executePing(iterator.parameters.headers.ip)
								if (pingModbusTCPIncident === true) {
									const modbusTCPIncidentResponse = await modbusTCPIncident.processing(iterator.parameters, iterator._id)
									await dataSave.save(modbusTCPIncidentResponse, iterator.machine, iterator.parameters.headers)
									break;
								} else {
									console.log("MACHINE NOT CONNECTED | " + iterator.parameters.headers.ip + ":" + iterator.parameters.headers.port + " | " + iterator.machine.location + " | " + iterator.machine.make + " " + iterator.machine.model)
									break;
								}
							case "modbus-tcp":
								const pingModbusTCP = await executePing(iterator.parameters.headers.ip)
								if (pingModbusTCP === true) {
									const modbusTCPResponse = await modbusTCP.processing(iterator.parameters, iterator._id)
									await dataSave.save(modbusTCPResponse, iterator.machine, iterator.parameters.headers)
									break;
								} else {
									console.log("MACHINE NOT CONNECTED | " + iterator.parameters.headers.ip + ":" + iterator.parameters.headers.port + " | " + iterator.machine.location + " | " + iterator.machine.make + " " + iterator.machine.model)
									break;
								}
							case "modbus-rtu":
								const modbusRTUResponse = await modbusRTU.processing(iterator.parameters, iterator._id)
								await dataSave.save(modbusRTUResponse, iterator.machine, iterator.parameters.headers)
								break;
							case "mc-protocol":
								const pingMCProtocol = await executePing(iterator.parameters.headers.ip)
								if (pingMCProtocol === true) {
									const mcProtocolResponse = await MCProtocol.processing(iterator.parameters, iterator._id)
									await dataSave.save(mcProtocolResponse, iterator.machine, iterator.parameters.headers)
									break;
								} else {
									console.log("MACHINE NOT CONNECTED | " + iterator.parameters.headers.ip + ":" + iterator.parameters.headers.port + " | " + iterator.machine.location + " | " + iterator.machine.make + " " + iterator.machine.model)
									break;
								}
							case "ms-access":
								const MSAccessResponse = await MSAccess.processing(iterator.parameters, iterator._id)
								await dataSave.save(MSAccessResponse, iterator.machine, iterator.parameters.headers)
								break;
							default:
								break;
						}
						await sleep(60000);
					} catch (e) {
						await sleep(10000);
					}
				}
			}

			const getParameters2 = async () => {
				for (const iterator of dataConfig) {
					try {
						switch (iterator.parameters.protocol) {
							case "telnet":
								const pingTelnet = await executePing(iterator.parameters.headers.ip)
								if (pingTelnet === true) {
									const telnetResponse = await telnet.processing(iterator.parameters, iterator._id)
									await dataSave.save(telnetResponse, iterator.machine, iterator.parameters.headers)
									break;
								} else {
									console.log("MACHINE NOT CONNECTED | " + iterator.parameters.headers.ip + ":" + iterator.parameters.headers.port + " | " + iterator.machine.location + " | " + iterator.machine.make + " " + iterator.machine.model)
									break;
								}
							default:
								break;
						}
						await sleep(50);
					} catch (e) {
						await sleep(50);
					}
				}
			}
			while (1) {
				getParameters1();
				getParameters2();
				await sleep(30000);
			}
		} else {
			console.log("DEVICE NOT CONFIGURED")
			await client.close();
		}
	} finally {
		await client.close();
	}
}

connectToMongoDB().catch(console.error);