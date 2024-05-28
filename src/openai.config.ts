import OpenAI from 'openai';
import { config } from 'dotenv';
const apiKey = config().parsed?.OPENAI_API_KEY;
export const openai = new OpenAI({
  apiKey: apiKey, // This is the default and can be omitted
});
// const openai = new OpenAI.OpenAIApi(configuration);
