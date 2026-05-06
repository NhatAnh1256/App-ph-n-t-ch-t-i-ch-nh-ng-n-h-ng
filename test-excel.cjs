const XLSX = require('xlsx');
const fs = require('fs');

const files = fs.readdirSync('./public').filter(f => f.endsWith('.xlsx'));
if (files.length > 0) {
  const file = './public/' + files[0];
  console.log("Reading", file);
  const wb = XLSX.readFile(file);
  const sheetNames = wb.SheetNames;
  console.log("Sheets:", sheetNames);
  
  if (sheetNames.includes('BCTC')) {
    const sheet = wb.Sheets['BCTC'];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
    if(data.length > 0) {
      const keys = Object.keys(data[0]);
      console.log("First row:", data[0]);
    }
  }
}
