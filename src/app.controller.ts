import {
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Controller,
  Get,
  Post,
  Body,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { AppService as UploadAppService } from './document/app.service';
import { IScrapeWebsiteUrl } from 'src/types';
import { Express } from 'express';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly uploadAppService: UploadAppService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/generate-q&a')
  async scrapeAndCreateQuestions(@Body() body: IScrapeWebsiteUrl) {
    const { url, questionQuantity } = body;
    if (!url || !questionQuantity) {
      throw new HttpException(
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
      );
    }
    const pageContent = await this.appService.getWebsiteContent(
      url,
      questionQuantity,
    );

    const questionsPerIndx = this.appService.divideEqually(
      questionQuantity,
      pageContent.length,
    );

    try {
      const allQuestions = await this.appService.createQuestions(
        pageContent,
        questionsPerIndx,
      );
      return allQuestions;
    } catch (err) {
      throw new HttpException(
        err.message || 'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/scrape')
  async scrape(@Body() body: IScrapeWebsiteUrl) {
    const { url } = body;
    return await this.appService.scrapeUrl(url);
    // const pageContent = await this.appService.getWebsiteContent(url);
  }
  @Post('upload-file-scrape')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body('questionQuantity') questionQuantity: number,
  ) {
    if (!files || !questionQuantity) {
      throw new HttpException('Missing required Items', HttpStatus.BAD_REQUEST);
    }
    if (files[0].mimetype.includes('image')) {
      const result = this.appService.createQuestionsWithImage(
        files,
        questionQuantity,
      );
      return result;
    }

    const fileContent = await this.uploadAppService.readPdfFile(
      files[0].path,
      questionQuantity,
    );
    const questionsPerIndx = this.appService.divideEqually(
      questionQuantity,
      fileContent.length,
    );
    try {
      const allQuestions = await this.appService.createQuestions(
        fileContent,
        questionsPerIndx,
      );
      return allQuestions;
    } catch (err) {
      throw new HttpException(
        err.message || 'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
