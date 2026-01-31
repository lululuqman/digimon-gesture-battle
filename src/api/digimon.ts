import { Digimon } from '../types';
import { DIGIMON_ASSETS } from '../config/digimonAssets';

const BASE_URL = 'https://digimon-api.vercel.app/api/digimon';

const applyAssetOverrides = (digimonList: Digimon[]): Digimon[] => {
  return digimonList.map(d => ({
    ...d,
    img: DIGIMON_ASSETS[d.name] || d.img
  }));
};

export const fetchAllDigimon = async (): Promise<Digimon[]> => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error('Failed to fetch Digimon');
  const data = await response.json();
  return applyAssetOverrides(data);
};

export const fetchDigimonByName = async (name: string): Promise<Digimon[]> => {
  const response = await fetch(`${BASE_URL}/name/${name}`);
  if (!response.ok) throw new Error(`Failed to fetch Digimon: ${name}`);
  const data = await response.json();
  return applyAssetOverrides(data);
};

export const fetchDigimonByLevel = async (level: string): Promise<Digimon[]> => {
  const response = await fetch(`${BASE_URL}/level/${level}`);
  if (!response.ok) throw new Error(`Failed to fetch Digimon level: ${level}`);
  const data = await response.json();
  return applyAssetOverrides(data);
};

export const getStarters = async (): Promise<Digimon[]> => {
  // Starters: Agumon, Gabumon, Patamon
  const starters = await Promise.all([
    fetchDigimonByName('Agumon'),
    fetchDigimonByName('Gabumon'),
    fetchDigimonByName('Patamon'),
  ]);
  return starters.map(s => s[0]);
};
