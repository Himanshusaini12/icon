const fs = require('fs').promises;

const INPUT_FILE = './output/all_elements.json';
const OUTPUT_FILE = './output/unique_elements.json';

async function removeDuplicates() {
  try {
    // Read the input file
    const data = await fs.readFile(INPUT_FILE, 'utf8');
    const elements = JSON.parse(data);

    console.log(`Total elements before deduplication: ${elements.length}`);

    // Create a Map to store unique elements
    const uniqueElements = new Map();

    // Iterate through elements and keep only unique ones
    elements.forEach(element => {
      if (!uniqueElements.has(element.element)) {
        uniqueElements.set(element.element, element);
      }
    });

    // Convert the Map values back to an array
    const uniqueElementsArray = Array.from(uniqueElements.values());

    console.log(`Total elements after deduplication: ${uniqueElementsArray.length}`);

    // Write the unique elements to the output file
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(uniqueElementsArray, null, 2));

    console.log(`Unique elements saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

removeDuplicates();