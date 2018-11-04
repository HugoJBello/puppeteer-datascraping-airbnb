
const fs = require('fs');


class FeatureProcessor {
    constructor() {
        this.nMuns = ["Madrid", "Móstoles", "Alcalá de Henares",
            "Fuenlabrada", "Leganés", "Getafe",
            "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas",
            "Las Rozas de Madrid", "San Sebastián de los Reyes",
            "Pozuelo de Alarcón", "Coslada", "Rivas-Vaciamadrid",
            "Valdemoro", "Majadahonda", "Collado Villalba", "Aranjuez",
            "Arganda del Rey", "Boadilla del Monte", "Pinto", "Colmenar Viejo",
            "Tres Cantos", "San Fernando de Henares", "Galapagar", "Arroyomolinos",
            "Villaviciosa de Odón", "Navalcarnero", "Ciempozuelos", "Torrelodones",
            "Paracuellos de Jarama", "Mejorada del Campo", "Algete"]
        this.foundFeatures = {};
        this.scrapingIndex = {};
        this.fileContents = fs.readFileSync("./data/SECC_CPV_E_20111101_01_R_INE_MADRID_cs_epsg.geojson.json", 'utf8');
        this.geoJson = JSON.parse(this.fileContents);

        this.outputDir = "data/separatedFeatures/";
        this.outputFilenameFeatures = "./data/separatedFeatures/separatedFeatures.json";
        this.outputFilenameIndex = "./data/separatedFeatures/scrapinIndex.json";
    }

    main() {
        this.generateProcessedFeaturesAndIndex();
        this.saveInFile();
        //console.log(this.foundFeatures);
    }

    generateProcessedFeaturesAndIndex() {
        for (let feature of this.geoJson["features"]) {
            if (this.nMuns.includes(feature.properties["NMUN"])) {
                let procFeature = this.processFeature(feature);
                if (feature.properties["NMUN"] in this.foundFeatures) {
                    this.foundFeatures[feature.properties["NMUN"]][procFeature.cusec] = procFeature;
                    this.scrapingIndex[feature.properties["NMUN"]][procFeature.cusec] = false;
                } else {
                    this.foundFeatures[feature.properties["NMUN"]] = {};
                    this.scrapingIndex[feature.properties["NMUN"]] = {};
                    this.foundFeatures[feature.properties["NMUN"]][procFeature.cusec] = procFeature;
                    this.scrapingIndex[feature.properties["NMUN"]][procFeature.cusec] = false;

                }
            }
        }
    }

    processFeature(feature) {
        let processedFeature = {};
        processedFeature["nmun"] = feature.properties["NMUN"];
        processedFeature["cusec"] = feature.properties["CUSEC"];
        processedFeature["coordinates"] = feature["geometry"].coordinates;
        processedFeature["type"] = feature["geometry"].type;
        const boundingBox = this.getBoundingBox(processedFeature["coordinates"], processedFeature["type"]);
        processedFeature["boundingBox"] = boundingBox;
        return processedFeature;

    }

    getBoundingBox(coordinates, type) {
        if (type === "MultiPolygon") {
            let maxX = -180;
            let maxY = -180;
            let minX = 180;
            let minY = 180;
            /*
            let boundingBox = [coordinates[0][0][0], coordinates[0][0][0]];
            //console.log("\n------------------------------");
            //console.log(coordinates[0][0]);
            const reducer = (currentBBox, currentValue) => {
                return [
                    [Math.min(currentValue[0], currentBBox[0][0]), Math.max(currentValue[1], currentBBox[0][1])],
                    [Math.max(currentValue[0], currentBBox[1][0]), Math.min(currentValue[1], currentBBox[1][1])]
                ]
            }
            return coordinates[0][0].reduce(reducer, boundingBox);
            */
            for (const point of coordinates[0][0]) {
                maxX = Math.max(point[0], maxX);
                maxY = Math.max(point[1], maxY);
                minX = Math.min(point[0], minX);
                minY = Math.min(point[1], minY);
            }
            return [[minX, maxY], [maxX, minY]];
        }
    }

    saveInFile() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync("./" + outputDir);
        }
        fs.writeFileSync(this.outputFilenameFeatures, JSON.stringify(this.foundFeatures));
        fs.writeFileSync(this.outputFilenameIndex, JSON.stringify(this.scrapingIndex));

    }
}


const filterer = new FeatureProcessor();
filterer.main();
