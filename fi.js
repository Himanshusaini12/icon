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

const Element = mongoose.model('Hehe-final2', ElementSchema);

async function scrapeElements(elements, startIndex, browserIndex) {
  let browser;
  let page;

  while (startIndex < elements.length) {
    try {
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      page = await browser.newPage();
      await page.goto('https://infinite-craft.gg/recipes/', { waitUntil: 'networkidle0' });

      for (let i = startIndex; i < elements.length; i++) {
        const element = elements[i];
        
        // Clear the search bar
        await page.click('#search-bar input');
        await page.$eval('#search-bar input', el => el.value = '');
        await page.waitForTimeout(500);

        // Type the new search term
        await page.type('#search-bar input', element[1]);

        const elementHandle = await page.evaluateHandle((icon, name) => {
          const elements = document.querySelectorAll('.item.item-used');
          for (const el of elements) {
            if (el.textContent.includes(icon) && el.textContent.includes(name)) {
              return el;
            }
          }
          return null;
        }, element[0], element[1]);

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
            console.log(`Browser ${browserIndex}: Saved element ${elementInfo.element} and recipes to MongoDB (${i + 1}/${elements.length})`);
          }
        } else {
          console.log(`Browser ${browserIndex}: No results found for ${element[1]} (${element[0]}) (${i + 1}/${elements.length})`);
        }

        startIndex = i + 1;
      }

      // If we've processed all elements without error, break the while loop
      break;

    } catch (error) {
      console.error(`Browser ${browserIndex}: Encountered an error:`, error);
      console.log(`Browser ${browserIndex}: Skipping element ${startIndex + 1} and restarting from element ${startIndex + 2}`);
      startIndex++; // Skip the current element
    } finally {
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
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
  const chunkSize = Math.ceil(elements.length / 3);

  await Promise.all([
    scrapeElements(elements.slice(0, chunkSize), 0, 1),
    scrapeElements(elements.slice(chunkSize, 2 * chunkSize), 0, 2),
    scrapeElements(elements.slice(2 * chunkSize), 0, 3)
  ]);

  await mongoose.connection.close();
}

scrapeRecipes().catch(console.error);
