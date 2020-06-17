const puppeteer = require('puppeteer');
const fs = require('fs');
const stringify = require('csv-stringify');
const slugify = require('slugify');
const Queue = require('bull');

(async () => {
  var categoryPagesQueue = new Queue('category-pages-queue');
  var browser = await puppeteer.launch();

  categoryPagesQueue.process(async (job,done) => {
      let category = job.data;

      (function scrapeCategoryPage(category){
        browser.newPage().then((page) => {
          page.goto(category.link,{timeout:15000}).then(() => {
            console.log('Successfully navigated to category link: ' + category.link);

            // Scrape Category Page
            page.$$eval('a.core',productLinkElements => {
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
                    let name = await page.$eval('#jm > main > div > section > div > div.col10 > div.-df.-j-bet > div > h1',titleH1Element => titleH1Element.innerText).catch(error => {
                        console.log(error);
                        return '';
                    });
                    let brand = await page.$eval('#jm > main > div > section > div > div.col10 > div.-phs > div.-fs14.-pvxs > a', brandLinkElement => brandLinkElement.innerText).catch(error => {
                        console.log(error);
                        return '';
                    });
                    let description = await page.$eval('#jm > main > div > div.col12 > div > div.markup.-mhm.-pvl.-oxa.-sc', descriptionDivElement => descriptionDivElement.innerHTML.replace(/\r?\n|\r/g,'')).catch(error => {
                        console.log(error);
                        return '';
                    });
                    let weight = await page.$x("//span[text()='Weight (kg)']").then(async (result) => {
                        return result.length ? await page.evaluate(async weightElement => {
                          return Number.parseFloat((await weightElement.parentElement.innerText).substr(13));
                        }, result[0]) : '';
                    });
                    let model = await page.$x("//span[text()='Model']").then(async (result) => {
                        return result.length ? (await page.evaluate(modelElement => modelElement.parentElement.innerText, result[0])).substr(7) : '';
                    });
                    let sku = await page.$x("//span[text()='SKU']").then(async (result) => {
                        return result.length ? (await page.evaluate(skuElement => skuElement.parentElement.innerText, result[0])).substr(5) : 0;
                    });
                    let imageLinks = await page.$$eval('#imgs > a > img', imageLinkElements => {
                        let imageLinks = '';
                        for(let i = 0; i < imageLinkElements.length; i++){
                            if(i == imageLinkElements.length){
                                imageLinks = imageLinks + imageLinkElements[i].getAttribute('data-src');
                            }else{
                                imageLinks = imageLinks + imageLinkElements[i].getAttribute('data-src') + '|';
                            }
                        }

                        return imageLinks;
                    });
                    let listingPrice = Number.parseFloat((await page.$eval('div.-hr.-pvs.-mtxs > span', priceSpanElement => priceSpanElement.innerText)).substr(4));

                    let productData = {
                      name: name,
                      slug: slugify(name.toLowerCase()),
                      active: 'TRUE',
                      category: slugify(category.name.toLowerCase()),
                      brand: brand,
                      description: description,
                      hasVariant: 'FALSE',
                      requiresShipping: 'TRUE',
                      imageLinks: imageLinks,
                      listingPrice: listingPrice,
                      weight: weight,
                      sku: sku,
                      model: model,
                      manufacturer: '',
                      originCountry: '',
                      tags: '',
                      minPrice: '',
                      maxPrice: '',
                      gtin: '',
                      gtinType: '',
                      mpn: '',
                    };

                    // Create & Save Category in CSV file
                    const file = (category.name + '.csv');
                    stringify([productData],{
                      header: !(fs.existsSync(file)),
                      quoted:true,
                      columns:[
                        {key:'name', header:'NAME'},{key:'slug', header:'SLUG'},{key:'active', header:'ACTIVE'},
                        {key:'category',header:'CATEGORY'},{key:'brand',header:'BRAND'},{key:'description',header:'DESCRIPTION'},
                        {key:'hasVariant',header:'HAS_VARIANT'},{key:'requiresShipping',header:'REQUIRES_SHIPPING'},{key:'imageLinks',header:'IMAGE_LINKS'},
                        {key:'listingPrice',header:'LISTING_PRICE'},{key:'weight',header:'WEIGHT_(KG)'},{key:'sku',header:'SKU'},
                        {key:'model',header:'MODEL'},{key:'manufacturer',header:'MANUFACTURER'},{key:'originCountry',header:'ORIGIN_COUNTRY'},
                        {key:'tags',header:'TAGS'},{key:'minPrice',header:'MINIMUM_PRICE'},{key:'maxPrice',header:'MAXIMUM_PRICE'},
                        {key:'gtin', header:'GTIN'},{key:'gtinType',header:'GTIN_TYPE'},{key:'mpn',header:'MPN'},
                      ]},(error, csv_string) => {
                        fs.appendFile(file, csv_string, (err) => {
                            if (err) throw err;
                            console.log('Added ' + productData.name + ' to ' + file);

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
                }).catch(error => {
                  console.log(error);
                });
              })();
            });
          }).catch(error => {
            console.log(error);
          });
        });
      })(category);
  });
})();
