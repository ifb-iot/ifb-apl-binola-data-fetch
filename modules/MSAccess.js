const path = require('path');
const ADODB = require('node-adodb');

exports.processing = async (data, id) => {
	const connectionString = path.resolve(__dirname, data.headers.path);
	const connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${connectionString};`);

	const getTables = async () => {
		try {
			const sql = 'SELECT TOP 500 * FROM IFBYWD_BATCH_NEW ORDER BY TimeCol DESC';
			const rawData = await connection.query(sql);

			const result = rawData.map(item => {
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
			console.error('Error retrieving tables from Access database:', JSON.stringify(error));
		}
	};

	const tables = await getTables();
	return (tables)
}