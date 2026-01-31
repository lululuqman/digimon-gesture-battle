import { Gesture } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash'; // 2.5 Flash isn't public yet, using 1.5 Flash as proxy

export const getBattleCommentary = async (
  playerDigimon: string,
  enemyDigimon: string,
  playerGesture: Gesture,
  enemyGesture: Gesture,
  result: string
): Promise<string> => {
  if (!API_KEY) return "The battle rages on!";

  const prompt = `
    Context: A Digimon battle between ${playerDigimon} and ${enemyDigimon}.
    Action: ${playerDigimon} used ${playerGesture}, while ${enemyDigimon} used ${enemyGesture}.
    Result: ${result}.
    Task: Write a short, hype, 1-sentence commentary in the style of a Digimon announcer.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini error:', error);
    return "What an incredible move!";
  }
};

export const getOpponentGesture = (): Gesture => {
  const gestures: Gesture[] = ['fist', 'open_palm', 'peace'];
  return gestures[Math.floor(Math.random() * gestures.length)];
};
