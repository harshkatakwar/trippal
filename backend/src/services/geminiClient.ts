import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { MODEL_NAME } from '../utils/constants.js';

dotenv.config();

// In production, this should be fetched from Google Cloud Secret Manager
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const getModel = (systemInstruction: string) => {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
  });
};
