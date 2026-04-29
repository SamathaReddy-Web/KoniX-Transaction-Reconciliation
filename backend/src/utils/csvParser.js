const fs = require('fs');
const csv = require('csv-parser');

const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                if (Object.keys(data).length > 0 && Object.values(data).some(v => v !== '')) {
                    results.push(data);
                }
            })
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

module.exports = { parseCSV };
