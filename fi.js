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

const Element = mongoose.model('Hehe-final3', ElementSchema);

async function scrapeElements(elements) {
  let browser;
  let page;
  let startIndex = 0;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    page = await browser.newPage();
    await page.goto('https://infinite-craft.gg/recipes/', { waitUntil: 'networkidle0' });

    for (let i = startIndex; i < elements.length; i++) {
      const element = elements[i];
      
      try {
        // Clear the search bar
        await page.click('#search-bar input');
        await page.$eval('#search-bar input', el => el.value = '');
        await page.waitForTimeout(500);

        // Type the new search term
        await page.type('#search-bar input', element[1]);

        const elementHandle = await page.evaluateHandle((name) => {
          const cleanText = (text) => text.replace(/[^a-zA-Z]/g, '').toLowerCase();
          const cleanName = cleanText(name);
          
          const elements = document.querySelectorAll('.item.item-used');
          for (const el of elements) {
            const elText = cleanText(el.textContent);
            if (elText === cleanName) {
              return el;
            }
          }
          return null;
        }, element[1]);

        if (elementHandle) {
          await elementHandle.click();
          await page.waitForSelector('table:nth-child(1) tr:nth-child(1) > td:nth-child(2)', { timeout: 30000 });

          const elementInfo = await page.evaluate(() => {
            const h2Element = document.querySelector('h2 .item');
            if (h2Element) {
              return { element: h2Element.textContent.trim() };
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
            const elementDoc = new Element({
              element: elementInfo.element,
              recipes: formattedRecipes
            });
            await elementDoc.save();
            console.log(`Saved element ${elementInfo.element} and recipes to MongoDB (${i + 1}/${elements.length})`);
          }
        } else {
          console.log(`No results found for ${element[1]} (${element[0]}) (${i + 1}/${elements.length})`);
        }
      } catch (error) {
        console.error(`Encountered an error processing element ${element[1]}:`, error);
        console.log(`Skipping element ${i + 1} and continuing with the next one`);
      }
    }
  } catch (error) {
    console.error('Encountered a critical error:', error);
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeRecipes() {
  let data;

  try {
    data = JSON.parse(await fs.readFile('filtered_data.json', 'utf8'));
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

  const elements = Object.entries(data).map(([key, value]) => value);

  await scrapeElements(elements);

  await mongoose.connection.close();
}

scrapeRecipes().catch(console.error);