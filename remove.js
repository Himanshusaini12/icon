const fs = require('fs');

// Read the JSON files
const data = JSON.parse(fs.readFileSync('data1.json', 'utf8'));
const names = JSON.parse(fs.readFileSync('name.json', 'utf8'));

// Log the size of the original data
console.log('Size of original data:', Object.keys(data).length);

// Create a set of full names (emoji + name) without spaces for faster lookup
const nameSet = new Set(names.map(name => name.replace(/\s+/g, '')));

// Filter the data
const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
  const fullName = `${value[0]}${value[1]}`.replace(/\s+/g, '');
  if (!nameSet.has(fullName)) {
    acc[key] = value;
  }
  return acc;
}, {});

// Write the filtered data to a new JSON file
fs.writeFileSync('filtered_data.json', JSON.stringify(filteredData, null, 2));

// Log the size of the filtered data
console.log('Size of filtered data:', Object.keys(filteredData).length);

console.log('Filtered data has been written to filtered_data.json');