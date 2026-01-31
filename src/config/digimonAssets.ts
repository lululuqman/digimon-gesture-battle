import AgumonGif from './Agumon.gif';
import GabumonGif from './Gabumon.gif'
import PatamonGif from './Patamon.gif'

export const DIGIMON_ASSETS: Record<string, string> = {
  // Example: Override Agumon's static image with a GIF
  // You can use local files (put them in public/ folder) or remote URLs
  'Agumon': AgumonGif,
  'Gabumon': GabumonGif,
  'Patamon': PatamonGif,
  
  // Add more Digimon here...
  // 'Gabumon': '/digimon/gabumon.gif', 
};
