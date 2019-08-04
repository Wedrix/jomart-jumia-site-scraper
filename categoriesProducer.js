const puppeteer = require('puppeteer');
const stringify = require('csv-stringify');
const fs = require('fs');

(async () => {

  var browser = await puppeteer.launch();

  browser.newPage().then((page) => {
    page.goto('https://www.jumia.com.gh/index/allcategories/',{timeout:15000}).then(() => {
        console.log('Successfully navigated to category link: https://www.jumia.com.gh/index/allcategories/');

        // Scrape Category Page
        page.$$eval('section.osh-category-tree ul.osh-subcategories>li.osh-subcategory:not(:first-child)>a',categoryLinkElements => {
            let categories = [];

            for(let i = 0; i < categoryLinkElements.length; i++) {
                let category = {};
                category.name = categoryLinkElements[i].innerText;
                category.link = categoryLinkElements[i].href + '?shipped_from=country_local';
                categories.push(category);
            }

            return categories;

        }).then(categories => {
            // Create & Save Categories in categories.csv

            categories.forEach((category,index) => {
                stringify([category],{
                    header: (index == 0),
                    quoted:true,
                    columns:[{key:'name', header:'name'},{key:'link', header:'link'},],
                },(error, csv_string) => {
                    if (error) throw error;
                    fs.appendFile('categories.csv', csv_string, (err) => {
                        if (err) throw err;
                        console.log(`Operation Complete. Successfully Added Category: '${category.name}' to categories.csv`);
                    });
                });
            });
        });
    });
  });
})();
