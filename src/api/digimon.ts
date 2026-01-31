import { Digimon } from '../types';

const BASE_URL = 'https://digimon-api.vercel.app/api/digimon';

export const fetchAllDigimon = async (): Promise<Digimon[]> => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error('Failed to fetch Digimon');
  return response.json();
};

export const fetchDigimonByName = async (name: string): Promise<Digimon[]> => {
  const response = await fetch(`${BASE_URL}/name/${name}`);
  if (!response.ok) throw new Error(`Failed to fetch Digimon: ${name}`);
  return response.json();
};

export const fetchDigimonByLevel = async (level: string): Promise<Digimon[]> => {
  const response = await fetch(`${BASE_URL}/level/${level}`);
  if (!response.ok) throw new Error(`Failed to fetch Digimon level: ${level}`);
  return response.json();
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
