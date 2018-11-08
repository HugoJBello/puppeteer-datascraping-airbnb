const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');
const fs = require('fs');
require('dotenv').load();

module.exports = class ScraperPuppeteerAirbnb {
    constructor() {
        this.browser = null;
        this.page = null;
        this.timeWaitStart = 3 * 1000;
        this.timeWaitClick = 500;
        this.retries = 3;
        this.mongoUrl = process.env['MONGO_URL'];

        this.config = require("./data/config/scrapingConfig.json");
        this.MongoClient = require('mongodb').MongoClient;
        this.separatedFeatures = require("./data/separatedFeatures/separatedFeatures.json");

        this.scrapingIndexPath = "./data/separatedFeatures/scrapingIndex.json";
        this.scrapingIndex = require(this.scrapingIndexPath);
        this.tmpDir = "data/tmp/"
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync("./" + this.tmpDir);
        }
    }

    async main() {
        console.log("starting app");
        //this.resetIndex();
        for (let nmun in this.separatedFeatures) {
            console.log("-----------------------\n Scraping data from " + nmun + "\n-----------------------");
            let municipioResults = await this.initializeMunicipio(nmun);
            for (let cusecName in this.separatedFeatures[nmun]) {
                console.log("\n------->" + cusecName)
                this.initializeConfigAndIndex();
                if (!this.scrapingIndex[nmun][cusecName]) {
                    let cusecFeature = this.separatedFeatures[nmun][cusecName];
                    const cusecData = await this.extractFromCusec(cusecFeature);
                    municipioResults.cusecs[cusecName] = cusecData;

                    this.updateIndex(cusecName, nmun);
                    this.saveData(municipioResults, nmun, cusecName);
                }
            }
        }

        this.resetIndexAndFinalize();
    }

    async initializeMunicipio(nmun) {
        if (!fs.existsSync(this.tmpDirSession)) {
            fs.mkdirSync("./" + this.tmpDirSession);
        }
        if (this.config.useMongoDb) {
            let municipio = await this.getMunicipioFromMongo(nmun);
            if (!municipio) {
                municipio = this.getNewMunicipio(nmun);
            }
            return municipio;
        } else {
            let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
            if (fs.existsSync(nmunPath)) {
                return require("./" + nmunPath);
            } else {
                return this.getNewMunicipio(nmun);
            }
        }
    }

    getNewMunicipio(nmun) {
        return { _id: nmun + "---" + this.config.sessionId, nmun: nmun, scrapingId: this.config.sessionId, date: this.date, cusecs: {} }
    }
    async getMunicipioFromMongo(nmun) {
        const self = this;
        const url = this.mongoUrl;
        const scrapingId = this.config.sessionId;
        return new Promise((resolve, reject) => {
            self.MongoClient.connect(url, function (err, client) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                const dbName = "airbnb-db";
                const collectionName = "summaries-airbnb-scraping";
                console.log("geting from mongo");
                const collection = client.db(dbName).collection(collectionName);
                const _id = nmun + "---" + scrapingId;
                console.log(_id);
                collection.findOne({ _id }, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    console.log(result);
                    resolve(result);
                });
                client.close();
            });
        });
    }

    initializeConfigAndIndex() {
        this.config = require("./data/config/scrapingConfig.json");
        this.scrapingIndex = require("./data/separatedFeatures/scrapingIndex.json");
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
    }

    async extractFromCusec(cusecFeature) {
        try {

            let index = require("./data/separatedFeatures/scrapingIndex.json");
            const nmun = cusecFeature.nmun;
            const cusec = cusecFeature.cusec;
            const boundingBox = cusecFeature.boundingBox;
            //https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=18&search_by_map=true&sw_lat=40.41092513867345&sw_lng=-3.703897645186509&ne_lat=40.41257982118033&ne_lng=-3.700771836660386&s_tag=gSIPGig_"];
            const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=${boundingBox[1][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[0][1]}&ne_lng=${boundingBox[1][0]}&s_tag=gSIPGig_`;
            console.log("\n");
            console.log(url);
            console.log("\n");


            await this.initializePuppeteer();
            await this.page.goto(url);
            await this.page.waitFor(this.timeWaitStart);

            let numberOfEntries;
            let prize;

            let tryCount = 1;
            let tryAgain = true
            while (tryAgain) {
                console.log("\n--->try number " + tryCount);
                let resultsFound = await this.anyResultsFound();
                let capchaFound = false //await checkIfCapcha();



                if (resultsFound) {
                    console.log("results were found");
                    numberOfEntries = await this.extractNumberOfEntries();
                    console.log("found " + numberOfEntries + " entries in this page");

                    prize = await this.extracPrize();
                    console.log("average prize " + prize + "  in this page");
                } else {
                    console.log("no results were found for this search");
                }
                tryAgain = (!numberOfEntries && tryCount < this.retries);
                tryCount = tryCount + 1;
            }



            const newData = { date: new Date(), number_of_ads: numberOfEntries, average_prize: prize };

            await this.page.screenshot({ path: 'example.png' });
            await this.saveHtml();
            await this.browser.close();

            return newData;
        } catch (err) {
            console.log(err);
            return undefined;
        }
    }
    async saveHtml() {
        let bodyHTML = await this.page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync("./data/htmPage.html", bodyHTML);
    }
    async initializePuppeteer() {
        this.browser = await puppeteer.launch({
            //executablePath: '/usr/bin/chromium-browser'
            userAgent: randomUA.generate(),
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
    }

    async anyResultsFound() {
        let title = await this.titleNumEntriesLess300();
        if (title) {
            return title.indexOf("alojamientos") > -1
        } else return false;
    }

    async extracPrize() {
        await this.clickPrizeButton();
        return await this.readPrize();
    }

    async clickPrizeButton() {
        try {
            const form = await this.page.$$('button._1i67wnzj');
            await form[3].click();
            await this.page.waitFor(this.timeWaitClick);
        } catch (err) {
            console.log(err);
        }
    }

    async readPrize() {
        try {
            const div = await this.page.$('div._1nhodd4u');
            const text = await (await div.getProperty('textContent')).jsonValue();
            const prize = text.replace("El precio medio por noche es de ", "").replace("€", "").trim();
            return prize;
        } catch (err) {
            console.log(err);
        }
    }
    async extractNumberOfEntries() {
        let numberOfEntries;
        let titleNumEntries = await this.titleNumEntriesLess300();
        if (!titleNumEntries) {
            titleNumEntries = await this.extractMoreThan300();
        }
        if (titleNumEntries.indexOf("Más de") === -1) {
            numberOfEntries = titleNumEntries;
        } else {
            await this.goToLastPage()
            numberOfEntries = await this.readNumberOfEntries();
        }
        return numberOfEntries.replace("alojamientos", "").trim();
    }

    async titleNumEntriesLess300() {
        //_jmmm34f
        try {
            const div = await this.page.$('h3._jmmm34f>div>div');
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text
        } catch (err) {
            console.log(err);
            await this.saveHtml();
            return undefined;
        }

    }

    async extractMoreThan300() {
        //_jmmm34f
        try {
            const div = await this.page.$('h3._jmmm34f>div');
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text
        } catch (err) {
            console.log(err);
            await this.saveHtml();
            return undefined;
        }
    }

    async goToLastPage() {
        try {
            const form = await this.page.$$('li._1am0dt>a._1ip5u88');
            const len = form.length;
            await form[len - 1].click();
            await this.page.waitFor(this.timeWaitClick);
        } catch (err) {
            console.log(err);
        }
    }

    async readNumberOfEntries() {
        try {
            const div = await this.page.$('div[style="margin-top: 8px;"]');
            const text = await (await div.getProperty('textContent')).jsonValue();
            await this.page.waitFor(this.timeWaitClick);
            return text.split(" ")[2].trim();
        } catch (err) {
            await this.saveHtml();
            console.log(err);
        }
    }


    async saveData(municipioResults, nmun, cusecName) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
        fs.writeFileSync(nmunPath, JSON.stringify(municipioResults));
        if (this.config.useMongoDb) {
            await this.saveDataInMongo(municipioResults, nmun, cusecName);
            // await this.updateStateExecMongo(municipioResults.cusec, nmun, true);
        }
    }

    async saveDataInMongo(municipioResults, nmun, cusecName) {
        const scrapingId = this.config.sessionId
        await this.MongoClient.connect(this.mongoUrl, function (err, client) {
            const db = "airbnb-db";
            const collectionName = "summaries-airbnb-scraping";
            console.log("saving data in mongodb");
            const collection = client.db(db).collection(collectionName);
            collection.save(municipioResults);

            const dbIndex = "airbnb-db";
            const collectionNameIndex = "state-execution-airbnb-scraping";
            console.log("updating log in mongodb");
            const executionDataLogIndex = { "_id": scrapingId, scrapingId: scrapingId, date: new Date(), active: true, lastNmun: nmun, lastCusec: cusecName }
            const collectionIndex = client.db(dbIndex).collection(collectionNameIndex);
            collectionIndex.save(executionDataLogIndex);
            client.close();
        });
    }

    async updateStateExecMongo(cusecName, nmun, active) {
        const scrapingId = this.config.sessionId
        await this.MongoClient.connect(this.mongoUrl, function (err, client) {
            const dbIndex = "index-airbnb-db";
            const collectionNameIndex = "state-execution-airbnb-scraping";
            console.log("updating log in mongodb");
            const executionDataLogIndex = { "_id": scrapingId, scrapingId: scrapingId, date: new Date(), active: active, lastNmun: nmun, lastCusec: cusecName }
            const collectionIndex = client.db(dbIndex).collection(collectionNameIndex);
            collectionIndex.save(executionDataLogIndex);
            client.close();
        });
    }

    saveDataAsCSV(municipioResults, nmun) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".csv";
        const header = "CUSEC;NMUN;N_ANUN;P_MEDIO;FECHA\n"

    }

    updateIndex(cusecName, nmun) {
        this.scrapingIndex[nmun][cusecName] = true;
        fs.writeFileSync(this.scrapingIndexPath, JSON.stringify(this.scrapingIndex));
    }

    async resetIndexAndFinalize() {
        const FeatureProcessor = require('./FeatureProcessor');
        const featureProcessor = new FeatureProcessor();
        featureProcessor.processAllFeaturesAndCreateIndex();
        this.date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');
        if (this.config.saveDataInMongo) await this.updateStateExecMongo("none", "none", false);
        this.config.sessionId = "scraping-airbnb--" + this.date;
        fs.writeFileSync("./data/config/scrapingConfig.json", JSON.stringify(this.config));
    }

}
