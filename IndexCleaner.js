
const fs = require('fs');


module.exports = class IndexCleaner {
    constructor(mapDir = "./data/", outputDir = "./data/separatedFeatures/") {
        this.outputDir = outputDir;
        this.outputFilenameIndex = this.outputDir + "scrapingIndex.json";
        this.fileContents = fs.readFileSync(this.outputFilenameIndex, 'utf8');
        this.scrapingIndex = JSON.parse(this.fileContents);
    }

    clearIndexNmunsDifferentThan(nmun) {
        for (const municipio in this.scrapingIndex) {
            for (const cusec in this.scrapingIndex[municipio]) {
                if (municipio !== nmun) {
                    this.scrapingIndex[municipio][cusec] = true;
                }
            }
        }
        this.saveInFile();
    }
    saveInFile() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
        fs.writeFileSync(this.outputFilenameIndex, JSON.stringify(this.scrapingIndex));

    }
}


