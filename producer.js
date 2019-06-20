const puppeteer = require('puppeteer');
const stringify = require('csv-stringify');
const slugify = require('slugify');
const Queue = require('bull');

(async () => {
  var categoryPagesQueue = new Queue('category-pages-queue');
  var browser = await puppeteer.launch();

  const categoryLinks = [
    'https://www.jumia.com.gh/home-office-appliances/?shipped_from=country_local',
    'https://www.jumia.com.gh/phones-tablets/?shipped_from=country_local',
    'https://www.jumia.com.gh/computing/?shipped_from=country_local',
    'https://www.jumia.com.gh/category-fashion-by-jumia/?shipped_from=country_local',
    'https://www.jumia.com.gh/home-office/?shipped_from=country_local',
  ];

  for(var i = 0; i < categoryLinks.length; i++){
      // Parse Category Pages
      let categoryPageLink = categoryLinks[i];

      (function parseCategoryPage(categoryPageLink){
        setTimeout(() => {
          browser.newPage().then((page) => {
            page.goto(categoryPageLink,{timeout:15000}).then(() => {
              console.log('Successfully navigated to category link: ' + categoryPageLink);

              categoryPagesQueue.add({link: categoryPageLink},{removeOnComplete: true});

              console.log('Successfully added link: ' + categoryPageLink + ' to queue');

              page.$('section.pagination a[title=Next]').then(nextCategoryPageElement => {
                if(nextCategoryPageElement){
                    page.$eval('section.pagination a[title=Next]',nextCategoryPageElement => nextCategoryPageElement.href).then(nextPageLink => {
                        parseCategoryPage(nextPageLink);
                    });
                }else{
                    console.log('Job Completed! Welcome Jomartt!');
                    page.close();
                }
              });
            });
          });
        }, 20000)
      })(categoryPageLink);
  }
})();
