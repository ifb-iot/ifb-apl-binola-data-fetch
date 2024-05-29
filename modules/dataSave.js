const { MongoClient } = require('mongodb');
require('dotenv').config()

exports.save = async (data, machine, headers) => {
	const client = new MongoClient(process.env.DB_URL);
	try {
		if (data) {
			data = Array.isArray(data) === true ? data : [data]
			await client.connect();
			const database = client.db(process.env.DB_NAME);
			const collection = database.collection('raw-data');

			const bulkOps = data.map(doc => ({
				updateOne: {
					filter: { id: doc.id, timestamp: doc.timestamp },
					update: { $setOnInsert: doc },
					upsert: true
				}
			}));
			await collection.bulkWrite(bulkOps);

			console.log("MACHINE DATA INSERTED | " + headers.ip + (headers.port === undefined ? "" : ":" + headers.port) + " | " + machine.location + " | " + machine.make + " " + machine.model + " | " + new Date().toDateString().slice(-11), new Date().toTimeString().substring(0, 8))
		}
	} finally {
		await client.close();
	}
}