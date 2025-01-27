import { verifyToken } from "../utils/jwt.js";


export const authGuard = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    request.user = decoded;
  } catch (error) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
};