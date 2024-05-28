const axios = require('axios');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const downloadPdf = async (url, filename) => {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer',
  });
  fs.writeFileSync(filename, response.data);
};

const extractTextFromPdf = async (filename) => {
  const dataBuffer = fs.readFileSync(filename);
  try {
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return '';
  }
};

export default async ({ url }: { url: string }): Promise<string> => {
  const pdfFilename = path.join(__dirname, 'downloaded_file.pdf');

  // Download the PDF
  await downloadPdf(url, pdfFilename);

  // Extract text from the downloaded PDF
  const pdfText = await extractTextFromPdf(pdfFilename);

  return pdfText;
};
