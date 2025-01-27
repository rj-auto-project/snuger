import jwt from 'jsonwebtoken';
import { User } from '../model/user.model.js';


export const authMiddleware = async (request, reply) => {
  try {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Authentication required');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) throw new Error('User not found');
    
    request.user = user;
  } catch (error) {
    reply.code(401).send({ error: error.message });
  }
};