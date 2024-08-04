const mongoose = require('mongoose');
const fs = require('fs').promises;

const MONGO_URI = 'mongodb+srv://himanshu:Himanshu1@cluster0.hlde7tl.mongodb.net/naTours?retryWrites=true&w=majority';
const BATCH_SIZE = 10000;
const CHUNK_SIZE = 1000;
const OUTPUT_DIR = './output';

const ElementSchema = new mongoose.Schema({
  element: String,
  recipes: [{
    ingredient1: String,
    ingredient2: String,
    result: String
  }]
});

const Element = mongoose.model('Hehe-final2', ElementSchema);

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

async function fetchAndSaveBatches() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    let batchNumber = 1;
    let processedCount = 0;

    const cursor = Element.find().cursor();

    while (true) {
      const batch = [];
      for (let i = 0; i < BATCH_SIZE; i += CHUNK_SIZE) {
        const chunk = [];
        for (let j = 0; j < CHUNK_SIZE; j++) {
          const doc = await cursor.next();
          if (!doc) {
            if (chunk.length > 0) batch.push(...chunk);
            break;
          }
          chunk.push(cleanDocument(doc.toObject()));
        }
        if (chunk.length === 0) break;
        batch.push(...chunk);
        processedCount += chunk.length;
        console.log(`Processed ${processedCount} documents`);
      }

      if (batch.length === 0) break;

      const outputFile = `${OUTPUT_DIR}/batch_${batchNumber}.json`;
      await fs.writeFile(outputFile, JSON.stringify(batch, null, 2));
      console.log(`Saved batch ${batchNumber} to ${outputFile}`);

      batchNumber++;
    }

    console.log('Finished fetching and saving all batches.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

fetchAndSaveBatches();