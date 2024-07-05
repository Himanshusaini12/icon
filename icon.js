const puppeteer = require('puppeteer');
const fs = require('fs').promises;
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

const Element = mongoose.model('Element', ElementSchema);

async function scrapeRecipes() {
  let data;
  let scrapedCount = 0;
  
  try {
    data = JSON.parse(await fs.readFile('data.json', 'utf8'));
  } catch (error) {
    console.error('Error reading data.json file:', error);
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return;
  }

  const browser = await puppeteer.launch({ headless: false , args: [
    '--no-sandbox'
], });
  const page = await browser.newPage();

  for (const [key, value] of Object.entries(data)) {
    const url = `https://infinite-craft.gg/recipes/?e=${key}`;
    
    try {
      console.log(`Scraping recipes for: ${key}`);
      await page.goto(url);
    
      await page.waitForSelector('table:nth-child(1) tr:nth-child(1) > td:nth-child(2)', { timeout: 15000 }).catch(() => null);

      const elementInfo = await page.evaluate(() => {
        const h2Element = document.querySelector('h2 .item');
        if (h2Element) {
          const elementText = h2Element.textContent.trim();
          return { element: elementText };
        }
        return null;
      });

      const recipes = await page.evaluate(() => {
        const centerPanel = document.querySelector('.panel.center-panel');
        if (!centerPanel) return [];

        const rows = Array.from(centerPanel.querySelectorAll('table tr'));
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return cells.map(cell => cell.textContent.trim());
        }).filter(recipe => recipe.length === 5);
      });

      const formattedRecipes = recipes.map(recipe => ({
        ingredient1: recipe[0],
        ingredient2: recipe[2],
        result: recipe[4]
      }));

      if (elementInfo) {
        try {
          const elementDoc = new Element({
            element: elementInfo.element,
            recipes: formattedRecipes
          });
          await elementDoc.save();
          scrapedCount++;
          console.log(`Saved element ${elementInfo.element} and recipes to MongoDB`);
          console.log(`Scraped ${scrapedCount} out of ${Object.keys(data).length} total`);
        } catch (error) {
          console.error(`Error saving element ${key} to MongoDB:`, error);
        }
      }
    } catch (error) {
      console.error(`Error scraping data for ${key}:`, error);
    }
  }

  try {
    const newFileName = `data_with_recipes_and_icons.json`;
    await fs.writeFile(newFileName, JSON.stringify(data, null, 2));
    console.log(`Updated data saved to ${newFileName}`);
  } catch (error) {
    console.error('Error writing updated data to file:', error);
  }

  try {
    await browser.close();
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing browser or MongoDB connection:', error);
  }
}

scrapeRecipes().catch(console.error);
