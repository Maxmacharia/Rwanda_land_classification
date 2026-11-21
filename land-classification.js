// Define time range and ROI
var start_date = '1999-01-01';
var end_date = '2002-12-31';
var vcr = ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/VCRP_Level3_Catchment');
var roi = vcr.geometry().dissolve();
Map.centerObject(roi, 8);
Map.addLayer(roi, {}, 'Rwanda ROI');
print('image', image);
// Load training data and assign class labels
var water_1 = ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/water').map(function(f){ return f.set('class', 1); });
var forest = ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/forest').map(function(f){ return f.set('class', 2); }).merge(tree);
var cropland = ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/cropland').map(function(f){ return f.set('class', 3); }).merge(crop);
var settlement = ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/built_up').map(function(f){ return f.set('class', 4); }).merge(built);
var grassland = ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/grassland').map(function(f){ return f.set('class', 5); }).merge(grass);
var wetland_1= ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/wetland').map(function(f){ return f.set('class', 6); });
var other = ee.FeatureCollection('projects/ee-oloofrank/assets/Rwanda_VCRP/bareland').map(function(f){ return f.set('class', 6); }).merge(others);
var wetland=water_1.merge(wetland_1).map(function(f){return f.set('class', 1);}).merge(water);

print(wetland, 'wetland')


var gdp_data = forest.merge(cropland).merge(settlement).merge(grassland).merge(wetland).merge(other);

var sent_2 = image.select(['b1', 'b2' , 'b3', 'b4', 'b5', 'b6'])
    .clip(roi);
print('sent_2 stats', sent_2);

// Calculate min/max statistics for each band in your ROI
var stats = sent_2.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e9
});
print('Band min/max values:', stats);

// Sentinel-2 data and indices
// var sent_2 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
//   .filterDate(start_date, end_date)
//   .filterBounds(roi)
//   .filter(ee.Filter.lt('CLOUD_COVER', 30))
//   .select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'])
//   .median()
//   .clip(roi);

// Center the map on your ROI
Map.centerObject(roi, 10);

var visParams = {
  bands: ['b3', 'b2', 'b1'],
  min: 7000,  // Close to your min values
  max: 20000, // Adjusted for better contrast (lower than max to avoid washed-out look)
  gamma: 1.2
};

// Add the layer
Map.addLayer(sent_2, visParams, 'L7 True Color');

// // Compute indices
// var evi = sent_2.expression(
//   '2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * B2 + 1))', {
//     'B8': sent_2.select('B8'),
//     'B4': sent_2.select('B4'),
//     'B2': sent_2.select('B2')
//   }).rename('EVI');
//
var ndmi = sent_2.normalizedDifference(['b4', 'b5']).rename('NDMI');
var mndwi = sent_2.normalizedDifference(['b2', 'b5']).rename('MNDWI');
var ndbi = sent_2.normalizedDifference(['b5', 'b4']).rename('NDBI');
var bsi = sent_2.expression(
  '((b5 + b3) - (b4 + b1)) / ((b5 + b3) + (b4 + b1))', {
    'b1': sent_2.select('b1'),
    'b3': sent_2.select('b3'),
    'b4': sent_2.select('b4'),
    'b5': sent_2.select('b5')
  }).rename('BSI');
  
// MSAVI - Modified Soil Adjusted Vegetation Index
// MSAVI = (2 * NIR + 1 - sqrt((2 * NIR + 1)^2 - 8 * (NIR - Red))) / 2
// var msavi = sent_2.expression(
//   '(2 * NIR + 1 - sqrt(pow((2 * NIR + 1), 2) - 8 * (NIR - RED))) / 2', {
//     'NIR': sent_2.select('B8A'),  // using 8A narrow NIR band
//     'RED': sent_2.select('B4')
//   }).rename('MSAVI');

// var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
//   .filterBounds(roi)
//   .filterDate(start_date, end_date)
//   .filter(ee.Filter.eq('instrumentMode', 'IW'))
//   .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
//   .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
//   .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
//   .select(['VV', 'VH'])
//   .median()
//   .clip(roi);

// var rvi = s1.expression(
//   '(4 * VH) / (VV + VH)', {
//     'VV': s1.select('VV'),
//     'VH': s1.select('VH')
//   }).rename('RVI');

// var ireci = sent_2.expression(
//   '(B7 - B4) / (B5 / B6)', {
//     'B7': sent_2.select('B7'),
//     'B4': sent_2.select('B4'),
//     'B5': sent_2.select('B5'),
//     'B6': sent_2.select('B6')
//   }).rename('IRECI');
  

var indices = sent_2.addBands([ndmi, mndwi, ndbi, bsi]);

// Sample training data
var training_data = gdp_data.filterBounds(roi);
var samples = indices.sampleRegions({
  collection: training_data,
  properties: ['class'],
  scale: 10,
  geometries: true
});

print(training_data, 'training_data')


// Split for training and testing
var split = 0.7;
var withRandom = samples.randomColumn();
var train = withRandom.filter(ee.Filter.lt('random', split));
var test = withRandom.filter(ee.Filter.gte('random', split));

// Train classifier
var classifier = ee.Classifier.smileRandomForest(500).train({
  features: train,
  classProperty: 'class',
  inputProperties: indices.bandNames()
});

var classified = indices.classify(classifier);

// Add classification layer with legend colors
var palette = [
  
  '#4682B4',  // 1 - Wetland
  '#006400',  // 2 - Forest
  '#FFD700',  // 3 - Cropland
  '#FF0000',  // 4 - Settlements
  '#d58cd6',  // 5 - Grassland
  '#808080'   // 6 - Other
];

Map.addLayer(classified, {min: 1, max: 6, palette: palette}, 'Land Cover Classification');

// ----------------------------------------
// Add Legend
// ----------------------------------------
var classNames = [
  
  'Wetlands',
  'Forest',
  'Cropland',
  'Settlements',
  'Grassland',
  'Other'
];

var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    backgroundColor: 'white'
  }
});

legend.add(ui.Label({
  value: 'Land Cover Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 8px 0',
    color: 'black'
  }
}));

// Create a row in the legend for each class
function makeLegendRow(color, name) {
  var colorBox = ui.Label('', {
    backgroundColor: color,
    padding: '8px',
    margin: '0 8px 4px 0'
  });
  var label = ui.Label(name, {margin: '0 0 4px 0'});
  return ui.Panel([colorBox, label], ui.Panel.Layout.Flow('horizontal'));
}

for (var i = 0; i < palette.length; i++) {
  legend.add(makeLegendRow(palette[i], classNames[i]));
}

Map.add(legend);
// Accuracy assessment
var testClassified = test.classify(classifier);
var confusionMatrix = testClassified.errorMatrix('class', 'classification');
print('Confusion Matrix:', confusionMatrix);
print('Overall Accuracy:', confusionMatrix.accuracy());
print('Kappa Coefficient:', confusionMatrix.kappa());
print('User Accuracy:', confusionMatrix.consumersAccuracy());
print('Producer Accuracy:', confusionMatrix.producersAccuracy());

// Export classified image
Export.image.toDrive({
  image: classified,
  description: 'Rwanda_LULC_Classification_roy_max_final',
  folder: 'ROY_MAX_rwanda',
  scale: 10,
  region: roi,
  maxPixels: 1e13
});


// After classification:
var kernel = ee.Kernel.square({radius: 1});  // 3x3 kernel

// Apply focal mode filter to reduce noise
var cleaned = classified.focal_mode({
  kernel: kernel,
  iterations: 1,
  // Can set 'skipMasked' if needed: skipMasked: true
});

// Display cleaned classification instead of raw
Map.addLayer(cleaned, {min: 1, max: 6, palette: palette}, 'Cleaned Land Cover Classification');

var exportParams = {
  image: cleaned,  // Your classified image
  description: 'Cleaned_Land_Cover_Classification_Export',
  folder: 'ROY_MAX_rwanda',  // Folder name in your Google Drive
  fileNamePrefix: 'Rwanda_LULC_Classification__roy_max_final_2000',
  region: roi,  // Define your study area (geometry)
  scale: 30,  // Landsat resolution (adjust if needed)  // Increase if needed for large areas
  fileFormat: 'GeoTIFF'
};
