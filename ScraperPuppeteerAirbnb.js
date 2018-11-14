const MongoSaver = require('./MongoDAO');
const FeatureProcessor = require('./FeatureProcessor');
const AirbnbBoxScraper = require('./AirbnbBoxScraper');
const fs = require('fs');

require('dotenv').load();

module.exports = class ScraperPuppeteerAirbnb {
    constructor() {

        this.mongoUrl = process.env['MONGO_URL'];

        this.config = require("./data/config/scrapingConfig.json");
        this.featureProcessor = new FeatureProcessor();
        this.featureProcessor.sessionId = this.config.sessionId;
        this.scrapingIndexPath = "./data/separatedFeatures/scrapingIndex.json";

        this.appId = this.config.appId;
        this.mongoSaver = new MongoSaver(this.mongoUrl, this.appId, this.config);

        this.MongoClient = require('mongodb').MongoClient;
        this.separatedFeatures = require("./data/separatedFeatures/separatedFeatures.json");
        this.boxScraper = new AirbnbBoxScraper();

        this.scrapingIndex = null;
        this.tmpDir = "data/tmp/"
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync("./" + this.tmpDir);
        }
    }

    async main() {
        console.log("starting app");

        await this.initializeConfigAndIndex();
        for (let nmun in this.separatedFeatures) {
            console.log("-----------------------\n Scraping data from " + nmun + "\n-----------------------");
            let municipioResults = await this.initializeMunicipio(nmun);
            for (let cusecName in this.separatedFeatures[nmun]) {
                console.log("\n------->" + cusecName)
                if (!this.scrapingIndex.municipios[nmun].cusecs[cusecName]) {
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
            let municipio = await this.mongoSaver.getMunicipioFromMongo(nmun);
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
        return { _id: nmun + "---" + this.config.sessionId, nmun: nmun, scrapingId: this.config.sessionId, date: new Date(), cusecs: {} }
    }


    async initializeConfigAndIndex() {
        this.config = require("./data/config/scrapingConfig.json");
        if (this.config.useMongoDb) {
            this.scrapingIndex = await this.mongoSaver.getIndexFromMongo();
            if (!this.scrapingIndex) {
                console.log("------\n initializing index");
                this.featureProcessor.processAllFeaturesAndCreateIndex();
                this.scrapingIndex = this.featureProcessor.scrapingIndex;
            }
        } else {
            this.scrapingIndex = require("./data/separatedFeatures/scrapingIndex.json");
        }
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
    }



    async extractFromCusec(cusecFeature) {
        try {

            let index = require("./data/separatedFeatures/scrapingIndex.json");
            const nmun = cusecFeature.nmun;
            const cusec = cusecFeature.cusec;
            const boundingBox = cusecFeature.boundingBox;
            const result = await this.boxScraper.extractPrizeAndMetersUsingBoundingBox(boundingBox);

            return { date: new Date(), number_of_ads: result.numberOfEntries, average_prize: result.prize };
            //-------------------
        } catch (err) {
            console.log(err);
            return undefined;
        }
    }



    async saveData(municipioResults, nmun, cusecName) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
        fs.writeFileSync(nmunPath, JSON.stringify(municipioResults));
        if (this.config.useMongoDb) {
            await this.mongoSaver.saveDataInMongo(municipioResults, nmun, cusecName, this.scrapingIndex);
            // await this.updateStateExecMongo(municipioResults.cusec, nmun, true);
        }
    }

    saveDataAsCSV(municipioResults, nmun) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".csv";
        const header = "CUSEC;NMUN;N_ANUN;P_MEDIO;FECHA\n"

    }

    updateIndex(cusecName, nmun) {
        try {
            this.scrapingIndex.municipios[nmun].cusecs[cusecName] = true;
            fs.writeFileSync(this.scrapingIndexPath, JSON.stringify(this.scrapingIndex));
        } catch (err) {
            console.log("error saving index");
            console.log(err);
            throw err;
        }
    }


    async resetIndexAndFinalize() {
        this.featureProcessor.processAllFeaturesAndCreateIndex();
        this.date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');
        if (this.config.useMongoDb) await this.mongoSaver.updateStateExecMongo("none", "none", false);
        this.config.sessionId = "scraping-" + this.appId + "--" + this.date;
        fs.writeFileSync("./data/config/scrapingConfig.json", JSON.stringify(this.config));
    }
}
