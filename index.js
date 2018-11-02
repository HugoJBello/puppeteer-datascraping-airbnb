const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');

class ScraperPuppeteer {
    constructor() {
        this.browser = null;
        this.page = null;
        this.timeWaitStart = 3 * 1000;
        this.timeWaitClick = 500;
        this.urls = ["https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=17&search_by_map=true&sw_lat=40.40905406647768&sw_lng=-3.705462275072205&ne_lat=40.414397095593216&ne_lng=-3.69920720677469&s_tag=17boGCJc",
            "https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=18&search_by_map=true&sw_lat=40.41092513867345&sw_lng=-3.703897645186509&ne_lat=40.41257982118033&ne_lng=-3.700771836660386&s_tag=gSIPGig_"];
    }

    async main() {
        console.log("starting app");
        for (let url of this.urls) {
            console.log("\n--------");
            console.log(url);
            console.log("\n");

            await this.initializePuppeteer();
            await this.page.goto(url);
            await this.page.waitFor(this.timeWaitStart);

            const numberOfEntries = await this.extractNumberOfEntries();
            console.log("found " + numberOfEntries + " entries in this page");

            const prize = await this.extracPrize();
            console.log("average prize " + prize + "  in this page");

            await this.page.screenshot({ path: 'example.png' });

            await this.browser.close();
        };


    }

    async extractFromCusec(cusecFeature) {
        const nmun = cusecFeature.nmun;
        const cusec = cusecFeature.cusec;
        const boundingBox = cusecFeature.boundingBox;
        //https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=18&search_by_map=true&sw_lat=40.41092513867345&sw_lng=-3.703897645186509&ne_lat=40.41257982118033&ne_lng=-3.700771836660386&s_tag=gSIPGig_"];
        const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=18&search_by_map=true&sw_lat=${boundingBox[0][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[1][0]}&ne_lng=${boundingBox[1][1]}&s_tag=gSIPGig_`;

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
        let titleNumEntries = await this.titleNumEntries();
        if (titleNumEntries.indexOf("Más de") === -1) {
            numberOfEntries = titleNumEntries;
        } else {
            await this.goToLastPage()
            numberOfEntries = await this.readNumberOfEntries();
        }
        return numberOfEntries;
    }

    async titleNumEntries() {
        //_jmmm34f
        try {
            const div = await this.page.$('h3._jmmm34f>div>div');
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text
        } catch (err) {
            console.log(err);
        }

    }

    async extractLessThan300() {

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
            console.log(err);
        }
    }

}



const app = new ScraperPuppeteer();
app.main();