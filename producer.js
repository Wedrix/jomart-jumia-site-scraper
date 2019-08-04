const puppeteer = require('puppeteer');
const parse = require('csv-parse');
const fs = require('fs');
const Queue = require('bull');

(async () => {
  var categoryPagesQueue = new Queue('category-pages-queue');
    // Empty Queue
    await categoryPagesQueue.empty();

  var browser = await puppeteer.launch();

  var categoriesCSV = fs.readFileSync('categories.csv','utf8');

  parse(categoriesCSV,{columns:true},(err,data) => {
      var categories = data;

      // Parse Category Pages
      var iterator = 0;

      (function parseCategoryPage(categoryPageLink){
          let category = categories[iterator];

          browser.newPage().then((page) => {
            page.goto(categoryPageLink,{timeout:15000}).then(() => {
              console.log('Successfully navigated to category link: ' + categoryPageLink);

              let queuedCategory = {
                name: category.name,
                link: categoryPageLink,
              };

              categoryPagesQueue.add(queuedCategory,{removeOnComplete: true});

              console.log(`Successfully added category: ${queuedCategory.name} => ${queuedCategory.link} to queue.`);

              page.$('section.pagination a[title=Next]').then(nextCategoryPageElement => {
                if(nextCategoryPageElement){
                    page.$eval('section.pagination a[title=Next]',nextCategoryPageElement => nextCategoryPageElement.href).then(nextPageLink => {
                        parseCategoryPage(nextPageLink);
                    });
                }else{
                    // Exit
                    iterator++;

                    if(iterator < categories.length){
                        let categoryPageLink = categories[iterator].link;
                        parseCategoryPage(categoryPageLink);
                    }else{
                        console.log('Job Completed! Welcome Jomartt!');
                        page.close();
                    }
                }
              });
            });
          });
      })(categories[0].link);
  });
})();
