export interface IQuery {
  id: number;
  queryId: string;
  question: string;
  response?: string;
  className: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryCreateDto
  extends Omit<IQuery, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

export interface QueryCreateVectorDto extends Omit<QueryCreateDto, 'queryId'> {}
export interface GetCachedResponseDto {
  question: string;
  className: string;
  similarityPercentage?: number | undefined;
}

export interface SaveCachedResponseDto extends GetCachedResponseDto {
  response: string;
}
export interface UpdateCachedResponseDto
  extends Omit<SaveCachedResponseDto, 'similarityPercentage'> {}

export interface IHybridSearchOptions {
  alpha?: number;
  limit?: number;
  vector?: number[];
}

export interface ISearchResponse {
  id: number;
  question: string;
  response: string;
  distance?: number;
  certainty?: number;
}

export interface IScrapeWebsiteUrl {
  url: string;
  toScrape: string;
  questionQuantity: number;
}
