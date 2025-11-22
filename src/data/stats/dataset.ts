import datasetJson from './dataset.json';

// Provide both a named export and a default for flexibility
export const dataset = datasetJson;
export default dataset;
export type Dataset = typeof dataset;