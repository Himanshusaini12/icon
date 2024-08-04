const mongoose = require('mongoose');
const fs = require('fs').promises;

const MONGO_URI = 'mongodb+srv://himanshu:Himanshu1@cluster0.hlde7tl.mongodb.net/naTours?retryWrites=true&w=majority';
const BATCH_SIZE = 10000;
const OUTPUT_FILE = './output/names2.json';

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

async function fetchAndSaveElementNames() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    await fs.mkdir('./output', { recursive: true });
    await fs.writeFile(OUTPUT_FILE, '[\n', 'utf8');

    let processedCount = 0;
    let isFirstBatch = true;

    for (const Model of [ElementFinal2, ElementFinals]) {
      let hasMore = true;
      let skip = 0;

      console.log(`Processing collection: ${Model.collection.name}`);

      while (hasMore) {
        const batch = await Model.find({}, 'element')
          .skip(skip)
          .limit(BATCH_SIZE)
          .lean();

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        const elementNames = batch.map(doc => doc.element);
        const batchJson = elementNames.map(name => JSON.stringify(name)).join(',\n');

        await fs.appendFile(OUTPUT_FILE, (isFirstBatch ? '' : ',\n') + batchJson, 'utf8');

        processedCount += batch.length;
        skip += batch.length;
        console.log(`Processed ${processedCount} elements`);

        isFirstBatch = false;
      }
    }

    await fs.appendFile(OUTPUT_FILE, '\n]', 'utf8');
    console.log(`Finished saving all element names to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

fetchAndSaveElementNames();