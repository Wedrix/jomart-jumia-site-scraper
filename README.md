## Jomartt Jumia Web Scraper

Jumia Web Scrapper for Jomartt.com

## Dev Stack

 - Node JS
 - Puppetter
 - Bull
 - CSV (Node Module)
 - Stringify

## Description

 1. The primary scripts are two namely consumer.js and producer.js
 2. The producer.js script parses 'categories.csv' for the various category links and pushes them unto the Queue.
 3. The consumer.js script parses each category link on the Queue, navigates to the product pages, extracts the relevant information and saves it into the CSV.
 4. An example file 'example_categories.csv' can be referenced for the expected format in which the categories should be saved. You can manually create the categories.csv file with the relevant categories you want to scrape by following the format.
 5. There's also a categoriesProducer.js file that automatically generates the 'categories.csv' file for you using the categories index page on jumia.com

## Typical Usage

 1. Install Node.js
 2. Run `npm install` to install all the necessary packages
 3. Run `node categoriesProducer.js` to generate the 'categories.csv' file
 4. Run `node producer.js` to parse the 'categories.csv' file and add the categories to the Queue for processing
 5. Run `node consumer.js` to extract the information from the product pages and create the categories CSV files