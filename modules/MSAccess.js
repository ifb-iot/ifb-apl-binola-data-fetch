const path = require('path');
const odbc = require('odbc');
const os = require('os');

const parseDate = (str) => {
	const [year, month, day] = str.split('-');
	return new Date(year, month - 1, day);
};

exports.processing = async (data, id) => {
	const dbPath = path.resolve(__dirname, data.headers.path);

	let connectionString;
	if (os.platform() === 'win32') {
		connectionString = `DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${dbPath};`;
	} else {
		connectionString = `DSN=${String(id)};Database=${dbPath};`;
	}

	console.log(data.headers.path)

	const getTables = async () => {
		let connection;
		try {
			connection = await odbc.connect(connectionString);
			const sql = 'SELECT * FROM ' + data.headers.database;
			const rawData = await connection.query(sql);

			const currentDate = new Date();
			const oneMonthsAgo = new Date();
			oneMonthsAgo.setMonth(currentDate.getMonth() - 1);

			const filteredData = rawData.filter(item => {
				const itemDate = parseDate(item[data.signals.timestamp].substring(0, 10));
				return itemDate >= oneMonthsAgo && itemDate <= currentDate;
			});

			const result = filteredData.map(item => {
				let filteredItem = {
					"id": id.toString(),
					"timestamp": "",
					"data": [{}]
				};

				data.signals.columns.forEach(field => {
					if (data.signals.timestamp === field) {
						filteredItem["timestamp"] = new Date(item[field]);
					} else {
						filteredItem["data"][0][field] = item[field];
					}
				});
				return filteredItem;
			});

			return result;
		} catch (error) {
			console.error('Error retrieving tables from Access database:', error);
		} finally {
			if (connection) {
				await connection.close();
			}
		}
	};

	const tables = await getTables();
	return tables;
};
