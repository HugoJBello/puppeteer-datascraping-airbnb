const IndexCleaner = require('../IndexCleaner')

const filterer = new IndexCleaner("../data/", "../data/separatedFeatures/");
filterer.clearIndexNmunsDifferentThan("Madrid");
