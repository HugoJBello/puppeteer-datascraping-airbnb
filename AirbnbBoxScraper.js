const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');
const fs = require('fs');

module.exports = class AirbnbBoxScraper {
    constructor() {
        this.timeWaitStart = 3 * 1000;
        this.timeWaitClick = 1000;
        this.retries = 3;
        this.scrapingIndexPath = "./data/separatedFeatures/scrapingIndex.json";

        this.browser = null;
        this.page = null;
    }


    async extractPrizeAndMetersUsingBoundingBox(boundingBox) {
        //https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=18&search_by_map=true&sw_lat=40.41092513867345&sw_lng=-3.703897645186509&ne_lat=40.41257982118033&ne_lng=-3.700771836660386&s_tag=gSIPGig_"];
        //const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=${boundingBox[1][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[0][1]}&ne_lng=${boundingBox[1][0]}&s_tag=gSIPGig_`;
        const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=${boundingBox[1][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[0][1]}&ne_lng=${boundingBox[1][0]}`;


        console.log("---------------------");
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
            //await this.page.waitFor(this.timeWaitClick);
        }



        await this.page.screenshot({ path: 'example.png' });
        await this.saveHtml();
        await this.browser.close();

        return { numberOfEntries, prize };
    }

    async initializePuppeteer() {
        this.browser = await puppeteer.launch({
            //executablePath: '/usr/bin/chromium-browser'
            userAgent: randomUA.generate(),
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        //const devices = require('puppeteer/DeviceDescriptors');
        //const iPhone = devices['iPhone 6'];
        //this.page.emulate(iPhone);
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
            const form = await this.page.$$('button._1i67wnzj>div');
            let prizeForm;
            for (const button of form) {
                const content = await this.page.evaluate(el => el.innerHTML, button);

                if (content.indexOf("Precio") > -1) {
                    prizeForm = button;
                    break;
                }
            }
            await prizeForm.click();
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
        await this.page.waitFor(this.timeWaitClick);
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

    async saveHtml() {
        let bodyHTML = await this.page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync("./data/htmPage.html", bodyHTML);
    }



}