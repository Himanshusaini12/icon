const mongoose = require('mongoose');
const fs = require('fs').promises;

const MONGO_URI = 'mongodb+srv://himanshu:Himanshu1@cluster0.hlde7tl.mongodb.net/naTours?retryWrites=true&w=majority';
const BATCH_SIZE = 10000;
const OUTPUT_FILE = './output/all_elements.json';

const ElementSchema = new mongoose.Schema({
  element: String,
  recipes: [{
    ingredient1: String,
    ingredient2: String,
    result: String
  }]
});

const ElementFinal2 = mongoose.model('Hehe-final2', ElementSchema);
const ElementFinals = mongoose.model('Hehe-finals', ElementSchema);
const ElementFinal3 = mongoose.model('Hehe-final3', ElementSchema);

function cleanDocument(doc) {
  const cleanDoc = { ...doc };
  delete cleanDoc._id;
  delete cleanDoc.__v;
  cleanDoc.recipes = doc.recipes.map(recipe => {
    const { ingredient1, ingredient2, result } = recipe;
    return { ingredient1, ingredient2, result };
  });
  return cleanDoc;
}

async function fetchAndSaveAllElements() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    await fs.mkdir('./output', { recursive: true });
    await fs.writeFile(OUTPUT_FILE, '[\n', 'utf8');

    let processedCount = 0;
    let isFirstBatch = true;

    for (const Model of [ElementFinal2, ElementFinals, ElementFinal3]) {
      let hasMore = true;
      let skip = 0;

      console.log(`Processing collection: ${Model.collection.name}`);

      while (hasMore) {
        const batch = await Model.find()
          .skip(skip)
          .limit(BATCH_SIZE)
          .lean();

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        const cleanedBatch = batch.map(cleanDocument);
        const batchJson = cleanedBatch.map(doc => JSON.stringify(doc)).join(',\n');

        await fs.appendFile(OUTPUT_FILE, (isFirstBatch ? '' : ',\n') + batchJson, 'utf8');

        processedCount += batch.length;
        skip += batch.length;
        console.log(`Processed ${processedCount} documents`);

        isFirstBatch = false;
      }
    }

    await fs.appendFile(OUTPUT_FILE, '\n]', 'utf8');
    console.log(`Finished saving all elements to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

fetchAndSaveAllElements();