import { Injectable } from '@nestjs/common';
import { readFileSync, unlinkSync } from 'fs';
import pdfParse from 'pdf-parse';
import { divideSentencesIntoParts, extractSentences } from 'src/scrape.service';

@Injectable()
export class AppService {
  async readPdfFile(path: string, questionQuantity): Promise<string[]> {
    const dataBuffer = readFileSync(path);
    const pdfData = await pdfParse(dataBuffer);
    const extractedSentences = extractSentences(pdfData.text);
    const divideNumber = Math.ceil(questionQuantity / 20);
    const parts = divideSentencesIntoParts(extractedSentences, divideNumber);
    unlinkSync(path);

    return parts;
  }

  async scrapeFileContent(content: string): Promise<string> {
    return content;
    // Implement your scraping logic here
  }
}
