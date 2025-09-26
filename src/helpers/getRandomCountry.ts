import { countries, Country } from "../data/countries";

export function getRandomCountry(): Country {
  return countries[Math.floor(Math.random() * countries.length)];
}

export function getDailyCountry() {
  const today = new Date();
  const seed = today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate();
  const index = seed % countries.length;
  return countries[index];
}