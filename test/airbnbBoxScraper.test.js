const chai = require('chai');
const AirbnbBoxScraper = require("../AirbnbBoxScraper");

const assert = chai.assert;
const chaiAlmost = require('chai-almost');
chai.use(chaiAlmost(0.01));

const expect = chai.expect;
describe('App', function () {
    describe('test scraper in a given box', async function () {
        this.timeout(150000);

        const scraper = new AirbnbBoxScraper();
        const boundingBox = [[
            -3.711928166620427,
            40.419080270378565], [
            -3.708153461055989,
            40.41613075904495]];

        const centerPoint = [-3.710040813838208, 40.41760551471175];


        it('scraping results shoud be not null', async function () {
            const resultAlquiler = await scraper.extractPrizeAndMetersUsingBoundingBox(boundingBox);
            assert(resultAlquiler !== null);
        });


    });
});