// src/types.ts
export type Country = { code: string; latitude: number; longitude: number; name: string };

export type CountryStats = {
  area: number | null;            // km²
  population: number | null;      // persons
  lifeExpectancy: number | null;  // years
  unemployment: number | null;    // %
  GDP: number | null;             // million EUR
  GDPPerCapita: number | null;    // EUR / inhabitant
};

export const countryStats: Record<string, CountryStats> = {
  "AT": { "area": 83882, "population": 8507786, "lifeExpectancy": 81.3, "unemployment": 4.5, "GDP": 473226.72, "GDPPerCapita": 51800 },
  "BE": { "area": 30665, "population": 11180840, "lifeExpectancy": 80.7, "unemployment": 4.7, "GDP": 596320.6, "GDPPerCapita": 50600 },
  "BG": { "area": 110995, "population": 7117453, "lifeExpectancy": 74.9, "unemployment": 3.8, "GDP": 94709.33, "GDPPerCapita": 14700 },
  "HR": { "area": 56594, "population": 4217632, "lifeExpectancy": 77.8, "unemployment": 4.2, "GDP": 78048.48, "GDPPerCapita": 19800 },
  "CY": { "area": 9253, "population": 860032, "lifeExpectancy": 82.5, "unemployment": 4.3, "GDP": 31339.99, "GDPPerCapita": 33800 },
  "CZ": { "area": 78870, "population": 10512419, "lifeExpectancy": 78.3, "unemployment": 2.2, "GDP": 317385.77, "GDPPerCapita": 29200 },
  "DK": { "area": 42926, "population": 5627235, "lifeExpectancy": 80.4, "unemployment": 4.7, "GDP": 376430, "GDPPerCapita": 63300 },
  "EE": { "area": 45336, "population": 1315819, "lifeExpectancy": 77.5, "unemployment": 6.5, "GDP": 38187.78, "GDPPerCapita": 28000 },
  "FI": { "area": 338441, "population": 5451270, "lifeExpectancy": 81.1, "unemployment": 7, "GDP": 273318, "GDPPerCapita": 49000 },
  "FR": { "area": 638474, "population": 66165980, "lifeExpectancy": 82.4, "unemployment": 6, "GDP": 2822454.6, "GDPPerCapita": 41300 },
  "DE": { "area": 357568, "population": 80767463, "lifeExpectancy": 80.6, "unemployment": 3, "GDP": 4185550, "GDPPerCapita": 49500 },
  "EL": { "area": 131692, "population": 10926807, "lifeExpectancy": 81.4, "unemployment": 9.4, "GDP": 225196.89, "GDPPerCapita": 21300 },
  "HU": { "area": 93013, "population": 9850217, "lifeExpectancy": 75.8, "unemployment": 3.7, "GDP": 196638.98, "GDPPerCapita": 20500 },
  "IE": { "area": 69946, "population": 4637852, "lifeExpectancy": 81, "unemployment": 3.3, "GDP": 509951.81, "GDPPerCapita": 96300 },
  "IT": { "area": 302073, "population": 60345917, "lifeExpectancy": 82.9, "unemployment": 5.7, "GDP": 2128001.4, "GDPPerCapita": 36100 },
  "LV": { "area": 64586, "population": 2001468, "lifeExpectancy": 74.3, "unemployment": 6.4, "GDP": 39072.48, "GDPPerCapita": 20800 },
  "LT": { "area": 65286, "population": 2947862, "lifeExpectancy": 74.1, "unemployment": 6.5, "GDP": 73792.83, "GDPPerCapita": 25700 },
  "LU": { "area": 2595, "population": 549680, "lifeExpectancy": 81.9, "unemployment": 5.1, "GDP": 79309.62, "GDPPerCapita": 118800 },
  "MT": { "area": 315, "population": 428156, "lifeExpectancy": 81.8, "unemployment": 2.5, "GDP": 20542.23, "GDPPerCapita": 37100 },
  "NL": { "area": 37368, "population": 16829289, "lifeExpectancy": 81.4, "unemployment": 2.6, "GDP": 1067599, "GDPPerCapita": 59700 },
  "PL": { "area": 311928, "population": 38017856, "lifeExpectancy": 77.1, "unemployment": 2.3, "GDP": 748923.38, "GDPPerCapita": 19900 },
  "PT": { "area": 92226, "population": 10444092, "lifeExpectancy": 80.9, "unemployment": 5.3, "GDP": 267384.33, "GDPPerCapita": 25300 },
  "RO": { "area": 238397, "population": 19947311, "lifeExpectancy": 75.1, "unemployment": 4.2, "GDP": 324368.57, "GDPPerCapita": 17000 },
  "SK": { "area": 49035, "population": 5415949, "lifeExpectancy": 76.6, "unemployment": 4.6, "GDP": 122918.89, "GDPPerCapita": 22500 },
  "SI": { "area": 20273, "population": 2061085, "lifeExpectancy": 80.5, "unemployment": 3.1, "GDP": 63951.24, "GDPPerCapita": 30200 },
  "ES": { "area": 505983, "population": 46495744, "lifeExpectancy": 83.2, "unemployment": 10.1, "GDP": 1498324, "GDPPerCapita": 31000 },
  "SE": { "area": 447424, "population": 9644864, "lifeExpectancy": 82, "unemployment": 6.2, "GDP": 540833.28, "GDPPerCapita": 51000 },
  "IS": { "area": 102679, "population": 325671, "lifeExpectancy": 82.1, "unemployment": 2.6, "GDP": null, "GDPPerCapita": null },
  "LI": { "area": 160, "population": 37129, "lifeExpectancy": 82.5, "unemployment": null, "GDP": null, "GDPPerCapita": null },
  "NO": { "area": 323380, "population": 5109056, "lifeExpectancy": 81.8, "unemployment": 2.6, "GDP": null, "GDPPerCapita": null },
  "CH": { "area": 41289, "population": 8139631, "lifeExpectancy": 82.9, "unemployment": 3.8, "GDP": null, "GDPPerCapita": null },
  "AL": { "area": null, "population": 2892394, "lifeExpectancy": 77.9, "unemployment": null, "GDP": null, "GDPPerCapita": null },
  "BA": { "area": null, "population": 3830911, "lifeExpectancy": null, "unemployment": 11.5, "GDP": null, "GDPPerCapita": null },
  "ME": { "area": 13882, "population": 621521, "lifeExpectancy": 76.5, "unemployment": null, "GDP": 6963.62, "GDPPerCapita": 11000 },
  "MK": { "area": 25435, "population": 2065769, "lifeExpectancy": 75.5, "unemployment": null, "GDP": 14582.72, "GDPPerCapita": 8000 },
  "RS": { "area": null, "population": 7146759, "lifeExpectancy": 75.3, "unemployment": 7.5, "GDP": 75203.97, "GDPPerCapita": 11400 },
  "TR": { "area": 780272, "population": 76667864, "lifeExpectancy": 78.2, "unemployment": 7.3, "GDP": 1030513.55, "GDPPerCapita": 12100 },
  "UA": { "area": null, "population": 45245894, "lifeExpectancy": null, "unemployment": null, "GDP": null, "GDPPerCapita": null },
  "MD": { "area": null, "population": 3557634, "lifeExpectancy": null, "unemployment": null, "GDP": null, "GDPPerCapita": null },
  "GE": { "area": null, "population": 4490498, "lifeExpectancy": null, "unemployment": null, "GDP": null, "GDPPerCapita": null },
  "XK": { "area": null, "population": 1820631, "lifeExpectancy": null, "unemployment": null, "GDP": null, "GDPPerCapita": null }
}

