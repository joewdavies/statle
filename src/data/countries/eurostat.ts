// eurostat scope

import { Country } from "./countries";

export const eurostatCountries: Country[] = [
  // --- EU Member States ---
  { code: "AT", latitude: 47.516231, longitude: 14.550072, name: "Austria" },
  { code: "BE", latitude: 50.503887, longitude: 4.469936, name: "Belgium" },
  { code: "BG", latitude: 42.733883, longitude: 25.48583, name: "Bulgaria" },
  { code: "HR", latitude: 45.1, longitude: 15.2, name: "Croatia" },
  { code: "CY", latitude: 35.126413, longitude: 33.429859, name: "Cyprus" },
  { code: "CZ", latitude: 49.817492, longitude: 15.472962, name: "Czechia" },
  { code: "DK", latitude: 56.26392, longitude: 9.501785, name: "Denmark" },
  { code: "EE", latitude: 58.595272, longitude: 25.013607, name: "Estonia" },
  { code: "FI", latitude: 61.92411, longitude: 25.748151, name: "Finland" },
  { code: "FR", latitude: 46.603354, longitude: 1.888334, name: "France" },
  { code: "DE", latitude: 51.165691, longitude: 10.451526, name: "Germany" },
  { code: "EL", latitude: 39.074208, longitude: 21.824312, name: "Greece" }, // Eurostat uses EL, not GR
  { code: "HU", latitude: 47.162494, longitude: 19.503304, name: "Hungary" },
  { code: "IE", latitude: 53.41291, longitude: -8.24389, name: "Ireland" },
  { code: "IT", latitude: 41.87194, longitude: 12.56738, name: "Italy" },
  { code: "LV", latitude: 56.879635, longitude: 24.603189, name: "Latvia" },
  { code: "LT", latitude: 55.169438, longitude: 23.881275, name: "Lithuania" },
  { code: "LU", latitude: 49.815273, longitude: 6.129583, name: "Luxembourg" },
  { code: "MT", latitude: 35.937496, longitude: 14.375416, name: "Malta" },
  { code: "NL", latitude: 52.132633, longitude: 5.291266, name: "Netherlands" },
  { code: "PL", latitude: 51.919438, longitude: 19.145136, name: "Poland" },
  { code: "PT", latitude: 39.399872, longitude: -8.224454, name: "Portugal" },
  { code: "RO", latitude: 45.943161, longitude: 24.96676, name: "Romania" },
  { code: "SK", latitude: 48.669026, longitude: 19.699024, name: "Slovakia" },
  { code: "SI", latitude: 46.151241, longitude: 14.995463, name: "Slovenia" },
  { code: "ES", latitude: 40.463667, longitude: -3.74922, name: "Spain" },
  { code: "SE", latitude: 60.128161, longitude: 18.643501, name: "Sweden" },

  // --- EFTA ---
  { code: "IS", latitude: 64.963051, longitude: -19.020835, name: "Iceland" },
  { code: "LI", latitude: 47.166, longitude: 9.555373, name: "Liechtenstein" },
  { code: "NO", latitude: 60.472024, longitude: 8.468946, name: "Norway" },
  { code: "CH", latitude: 46.818188, longitude: 8.227512, name: "Switzerland" },

  // --- Candidates & potential candidates ---
  { code: "AL", latitude: 41.153332, longitude: 20.168331, name: "Albania" },
  { code: "BA", latitude: 43.915886, longitude: 17.679076, name: "Bosnia and Herzegovina" },
  { code: "ME", latitude: 42.708678, longitude: 19.37439, name: "Montenegro" },
  { code: "MK", latitude: 41.608635, longitude: 21.745275, name: "North Macedonia" },
  { code: "RS", latitude: 44.016521, longitude: 21.005859, name: "Serbia" },
  { code: "TR", latitude: 38.963745, longitude: 35.243322, name: "Türkiye" },
  { code: "UA", latitude: 48.379433, longitude: 31.16558, name: "Ukraine" },
  { code: "MD", latitude: 47.411631, longitude: 28.369885, name: "Moldova" },
  { code: "GE", latitude: 42.315407, longitude: 43.356892, name: "Georgia" },
  { code: "XK", latitude: 42.602636, longitude: 20.902977, name: "Kosovo" }, // not in your old list, add manually
];
