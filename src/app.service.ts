import { Injectable } from '@nestjs/common';
import { getContent, scrapeWebsite } from './scrape.service';
import { openai } from './openai.config';
import fs from 'fs';
const countPairs = (text) => {
  // Assuming each question starts with "Q<number>:" and each answer starts with "A<number>:"
  const questionMatches = text.match(/Q\d*:/g);
  const answerMatches = text.match(/A\d*:/g);

  // Ensure that each question has a corresponding answer
  const pairs = Math.min(
    questionMatches ? questionMatches.length : 0,
    answerMatches ? answerMatches.length : 0,
  );

  return pairs;
};
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  divideEqually(num: number, parts: number): number[] {
    const lowerPart = Math.floor(num / parts);
    const higherPart = num - lowerPart * (parts - 1);
    const result = Array(parts - 1).fill(lowerPart);
    result.push(higherPart);
    return result;
  }

  async getWebsiteContent(
    url: string,
    questionQuantity: number,
  ): Promise<string[]> {
    return await getContent(url, questionQuantity);
  }

  async createQuestions(pageSections: string[], questionCount: number[]) {
    try {
      let startingCount = 1;
      let allQuestions = '';
      for (let [index, section] of pageSections.entries()) {
        const instruction = `this is the entire company website page content. i want you to get ignore all unnecessary stuff like add promotion or other links for website functionality and others, and read all main neccessary content/information that is given below. then create ${questionCount[index]} natural questions and answer to those questions. from what you give i should be able to know all needed info about the company. \n i want you give a response in a following format and start counting from \n ${startingCount}. ${startingCount}. Question: ... ? \n Answer: .... AND after every question answer add break line. \n`;
        const chatCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: instruction + ' \n ' + section,
            },
          ],
          model: 'gpt-4',
        });
        allQuestions += chatCompletion.choices[0].message.content + '\n';
        startingCount += questionCount[index];
        console.log('section ' + (index + 1) + ' completed');
      }
      return allQuestions;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  async scrapeUrl(url: string): Promise<any> {
    return await scrapeWebsite(url);
  }

  async createQuestionsWithImage(imgs, questionQuantity) {
    const images = imgs.map((img) => {
      const imageBuffer = fs.readFileSync(img.path);
      const base64Image = imageBuffer.toString('base64');
      return {
        type: 'image_url',
        image_url: {
          url: `data:${img.mimetype};base64,${base64Image}`,
        },
      };
    });

    let completeResponse = '';
    let humanResponseInstruction =
      'Create questions as if you were a customer of this insurance company. Do not ever place the source in your q&a pairs as `mentioned in this document` or `in the provided context`. Answers should be in a form of a customer service representative and in an extended/explanatory/detailed way. \n';
    let currentInstruction = `Given the provided context, generate at least ${questionQuantity} unique question-answer pairs. Each question should start with "Q<number>:" and each answer should start with "A<number>:". Ensure there are no repeated questions or answers. ${humanResponseInstruction} Here are the image contexts:`;
    let questionsGenerated = 0;

    while (questionsGenerated < questionQuantity) {
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              ...images,
              {
                type: 'text',
                text: currentInstruction,
              },
            ],
          },
        ],
        model: 'gpt-4o',
        max_tokens: 2048, // Adjust as necessary based on your token limit
      });

      const generatedText = chatCompletion.choices[0].message.content;
      completeResponse += generatedText + '\n\n';

      // Update the instruction for continuity
      currentInstruction = `Continue generating unique question-answer pairs based on the provided context and continue the question number with what was left off. Previously generated pairs:\n${completeResponse}`;

      questionsGenerated = countPairs(completeResponse); // Implement countPairs to count the number of pairs generated
    }

    return completeResponse;
  }
}
