const puppeteer = require('puppeteer');
const fs = require('fs');
const stringify = require('csv-stringify');
const slugify = require('slugify');
const Queue = require('bull');

(async () => {
  var categoryPagesQueue = new Queue('category-pages-queue');
  var browser = await puppeteer.launch();

  categoryPagesQueue.process(async (job,done) => {
      (function scrapeCategoryPage(categoryPageLink){
        browser.newPage().then((page) => {
          page.goto(categoryPageLink,{timeout:15000}).then(() => {
            console.log('Successfully navigated to category link: ' + categoryPageLink);

            // Scrape Category Page
            page.$$eval('section.products>div.sku>a.link',productLinkElements => {
              let productLinks = [];

              for(let i = 0; i < productLinkElements.length; i++){
                  productLinks.push(productLinkElements[i].href);
              }

              return productLinks;
            }).then((productLinks) => {
              var iterator = 0;

              (function scrapeProductPage(){
                let productLink = productLinks[iterator];

                page.goto(productLink,{timeout:15000}).then(async () => {
                    console.log('Successfully navigated to product link: ' + productLink);

                    // Scrape Product Page
                    let productName = await page.$eval('section.sku-detail>div.details-wrapper>div.details h1.title',productElement => productElement.innerText);
                    let brand = await page.$eval('section.sku-detail>div.details-wrapper>div.details>div.sub-title a', brandLinkElement => brandLinkElement.innerText);
                    let description = await page.$eval('div#productDescriptionTab>div.product-description', descriptionDivElement => descriptionDivElement.innerHTML);
                    let price = await page.$eval('div.details-footer>div.price-box span.price>:last-child', priceSpanElement => priceSpanElement.innerText);
                    let imageLinks = await page.$$eval('a.cycle-slide-item', imageLinkElements => {
                        let imageLinks = '';
                        for(let i = 0; i < imageLinkElements.length; i++){
                            if(i == imageLinkElements.length){
                                imageLinks = imageLinks + imageLinkElements[i].href;
                            }else{
                                imageLinks = imageLinks + imageLinkElements[i].href + ',';
                            }
                        }

                        return imageLinks;
                    });
                    let categories = 'laptop-accessories,android-phones'; // Mockup 

                    var productData = {
                      name: productName,
                      slug: slugify(productName.toLowerCase()),
                      active: 'TRUE',
                      categories: categories,
                      gtin: '',
                      gtinType: '',
                      modelNumber: '',
                      brand: brand,
                      mpn: '',
                      description: description,
                      manufacturer: '',
                      originCountry: 'GH',
                      hasVariant: 'FALSE',
                      requiresShipping: 'TRUE',
                      minPrice: '',
                      maxPrice: '',
                      imageLinks: imageLinks,
                      tags: '',
                    };

                    // Create & Save Category in CSV file
                    stringify([productData],{
                      header: !(fs.existsSync('jumia_products.csv')),
                      quote:true,
                      columns:[
                        {key:'name', header:'NAME'},{key:'slug', header:'SLUG'},{key:'active', header:'ACTIVE'},
                        {key:'categories',header:'CATEGORIES'},{key:'gtin', header:'GTIN'},{key:'gtinType',header:'GTIN_TYPE'},
                        {key:'modelNumber',header:'MODEL_NUMBER'},{key:'brand',header:'BRAND'},{key:'mpn',header:'MPN'},{key:'description',header:'DESCRIPTION'},
                        {key:'manufacturer',header:'MANUFACTURER'},{key:'originCountry',header:'ORIGIN_COUNTRY'},{key:'hasVariant',header:'HAS_VARIANT'},{key:'requiresShipping',header:'REQUIRES_SHIPPING'},
                        {key:'minPrice',header:'MINIMUM_PRICE'},{key:'maxPrice',header:'MAXIMUM_PRICE'},{key:'imageLinks',header:'IMAGE_LINKS'},{key:'tags',header:'TAGS'},
                      ]},(error, csv_string) => {
                        fs.appendFile('jumia_products.csv', csv_string, (err) => {
                            if (err) throw err;
                            console.log('Added ' + productName + ' to CSV');

                            // Exit
                            iterator++;

                            if(iterator < productLinks.length){
                              scrapeProductPage();
                            }else{
                              page.close();
                              done();
                            }
                        });
                    });
                });
              })();
            });
          });
        });
      })(job.data.link);
  });
})();
