
const nMuns = ["Madrid", "Móstoles", "Alcalá de Henares",
    "Fuenlabrada", "Leganés", "Getafe",
    "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas",
    "Las Rozas de Madrid", "San Sebastián de los Reyes",
    "Pozuelo de Alarcón", "Coslada", "Rivas-Vaciamadrid",
    "Valdemoro", "Majadahonda", "Collado Villalba", "Aranjuez",
    "Arganda del Rey", "Boadilla del Monte", "Pinto", "Colmenar Viejo",
    "Tres Cantos", "San Fernando de Henares", "Galapagar", "Arroyomolinos",
    "Villaviciosa de Odón", "Navalcarnero", "Ciempozuelos", "Torrelodones",
    "Paracuellos de Jarama", "Mejorada del Campo", "Algete"]

const foundFeatures = {};
const fs = require('fs');
const fileContents = fs.readFileSync("./data/SECC_CPV_E_20111101_01_R_INE_MADRID_cs_epsg.geojson.json", 'utf8')

const geoJson = JSON.parse(fileContents);
console.log(geoJson);

for (let feature of geoJson["features"]) {
    if (nMuns.includes(feature.properties["NMUN"])) {
        if (feature.properties["NMUN"] in foundFeatures) {
            foundFeatures[feature.properties["NMUN"]].push(feature)
        } else {
            foundFeatures[feature.properties["NMUN"]] = [feature]
        }
    }
}

const outputDir = "data/separatedFeatures/";
const outputFilename = "./data/separatedFeatures/separatedFeatures.json";
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync("./" + outputDir);
}
fs.writeFileSync(outputFilename, JSON.stringify(foundFeatures));

console.log(foundFeatures);