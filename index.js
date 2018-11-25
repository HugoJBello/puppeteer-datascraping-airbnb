

let ScraperPuppeteerAirbnbs;
const config = require("./data/config/scrapingConfig.json");

if (config.method == "boundingBox") {
    ScraperPuppeteerAirbnb = require("./ScraperPuppeteerAirbnbBoundingBox");
} else {
    ScraperPuppeteerAirbnb = require("./ScraperPuppeteerAirbnbCusec");
}


const app = new ScraperPuppeteerAirbnb();
app.main();