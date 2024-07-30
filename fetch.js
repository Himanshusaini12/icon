const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://himanshu:Himanshu1@cluster0.hlde7tl.mongodb.net/naTours?retryWrites=true&w=majority';

const ElementSchema = new mongoose.Schema({
  element: String,
  recipes: [{
    ingredient1: String,
    ingredient2: String,
    result: String
  }]
});

const Element = mongoose.model('Hehe-final', ElementSchema);

async function getLastProcessedElements() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const lastElements = await Element.find().sort({ _id: -1 }).limit(5).exec();
  await mongoose.connection.close();

  return lastElements;
}

getLastProcessedElements()
  .then(elements => {
    elements.forEach(element => console.log(element.element));
  })
  .catch(console.error);
