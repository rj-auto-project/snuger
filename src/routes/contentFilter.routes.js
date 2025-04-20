import { filterContent } from '../controllers/contentFilter.controller.js';

async function contentFilterRoutes(fastify, options) {
    fastify.post('/', filterContent);
}

export default contentFilterRoutes;