import { Comment } from "../model/comment.model.js";
import { Post } from "../model/post.model.js";


export const createComment = async (req, reply) => {
  const { postId, userId, content } = req.body;

  const comment = new Comment({ postId, userId, content });
  await comment.save();

  await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

  reply.send({ success: true, comment });
};
