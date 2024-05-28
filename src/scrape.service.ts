import puppeteer from 'puppeteer';
import { URL } from 'url';
import { encoding_for_model } from 'tiktoken';
import fs from 'fs';
import readPdfUrl from './document/pdfurlHandler';
import axios from 'axios';
import path from 'path';

function divideTextToTokens(textParts, encoder, maxTokens = 7000) {
  let parts = [];

  for (const part of textParts) {
    const perTokens = encoder.encode(part);
    // If the part has more tokens than the maximum allowed, split it into two and recurse
    if (perTokens.length > maxTokens) {
      const splitIndex = Math.floor(part.length / 2);
      const firstHalf = part.substring(0, splitIndex);
      const secondHalf = part.substring(splitIndex);

      // Recurse on the two halves
      const subParts = divideTextToTokens(
        [firstHalf, secondHalf],
        encoder,
        maxTokens,
      );
      parts = parts.concat(subParts);
    } else {
      // If the part is within the token limit, add it to the parts array
      parts.push(part);
    }
  }

  return parts;
}

export function divideSentencesIntoParts(sentences: string[], partsCount = 5) {
  const enc = encoding_for_model('gpt-4');
  const totalLength = sentences.reduce(
    (acc, sentence) => acc + sentence.length,
    0,
  );
  const partTargetLength = totalLength / partsCount;
  let parts = [];
  let currentPart: string[] = [];
  let currentLength = 0;

  sentences.forEach((sentence) => {
    if (
      currentLength + sentence.length > partTargetLength &&
      parts.length < partsCount - 1
    ) {
      const dividedParts = divideTextToTokens([currentPart.join(' ')], enc);
      dividedParts.forEach((part) => {
        parts.push([part]);
      });
      currentPart = [];
      currentLength = 0;
    }
    currentPart.push(sentence);
    currentLength += sentence.length;
  });

  // Add the last part
  const dividedParts = divideTextToTokens([currentPart.join(' ')], enc);
  dividedParts.forEach((part) => {
    parts.push([part]);
  });

  enc.free();
  // Merge sentences back into strings for each part
  return parts.map((part) => part.join(' '));
}

async function downloadFile(url) {
  try {
    // Ensure the uploads directory exists
    const uploadsDir = path.resolve(__dirname, '../uploads');
    console.log(__dirname);

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    // Extract the file name from the URL
    const fileName = path.basename(url);
    const filePath = path.join(uploadsDir, fileName);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading the file: ${error.message}`);
  }
}

export const scrapeWebsite = async function (rootUrl: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const urlsToVisit = new Set<string>([]);
  const visitedUrls = new Set();
  let contentLength: { url: string; content: string }[] = [];

  async function scrapeUrl(currentUrl: string) {
    if (visitedUrls.has(currentUrl)) {
      return;
    }

    try {
      visitedUrls.add(currentUrl);
      console.log(`Visiting ${currentUrl}`);
      let pageContent: string = '';
      if (
        currentUrl.endsWith('.pdf') ||
        currentUrl.endsWith('.xls') ||
        currentUrl.endsWith('.xlsx') ||
        currentUrl.endsWith('.doc') ||
        currentUrl.endsWith('.docx')
      ) {
        await downloadFile(currentUrl);
        // const pdfContent = await readPdfUrl({ url: currentUrl });
        // pageContent = pdfContent;
        pageContent = 'file downloaded';
      } else {
        await page.goto(currentUrl, {
          waitUntil: 'networkidle2',
        });
        pageContent = await page.evaluate(
          () => document?.querySelector('body')?.innerText,
        );
      }

      // // Scrape the content of the page
      contentLength.push({
        url: currentUrl,
        content: pageContent,
      });
      const links = await page.$$eval('a', (anchors) =>
        anchors.map((a) => a.href),
      );
      // add new url to urlsToVisit
      for (const link of links) {
        try {
          new URL(link);
        } catch (err) {
          continue;
        }
        const { origin, pathname, search } = new URL(link);
        const fullUrl = `${origin}${pathname}${search}`;

        if (origin === new URL(rootUrl).origin && !visitedUrls.has(fullUrl)) {
          urlsToVisit.add(fullUrl);
        }
      }
    } catch (error) {
      console.error(`Error scraping ${currentUrl}: ${error}`);
    }

    const nextUrl = urlsToVisit.values().next().value;
    console.log('nextUrl', nextUrl);
    if (nextUrl) {
      urlsToVisit.delete(nextUrl);
      await scrapeUrl(nextUrl);
    } else {
      await browser.close();
      console.log('Scraping complete');
    }
  }

  await scrapeUrl(rootUrl);
  return contentLength;
};

export const extractSentences = (content) => {
  const sentences = content?.match(/[^\.!\?]+[\.!\?]+/g) || [];
  return sentences;
};

export const getContent = async function (
  url: string,
  questionQuantity: number,
): Promise<string[]> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Extract text content
  const content = await page.evaluate(
    () => document.querySelector('body')?.innerText,
  );
  console.log(content);

  await browser.close();

  const sentences = content?.match(/[^\.!\?]+[\.!\?]+/g) || [];
  const divideNumber = Math.ceil(questionQuantity / 20);
  //   // Step 3: Divide sentences into 5 parts
  const parts = divideSentencesIntoParts(sentences, divideNumber);
  return parts;
};
