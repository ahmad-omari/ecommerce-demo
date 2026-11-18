import { http } from '@google-cloud/functions-framework';
import { app } from './app';

export const ahMarketplaceApi = app;
http('ahMarketplaceApi', ahMarketplaceApi);
