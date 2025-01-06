import { Post } from "../model/post.model";


export const createPost = async (req, reply) => {
  const { userId, content, images, audio, isAnonymous } = req.body;

  const post = new Post({
    userId,
    content,
    images,
    audio,
    isAnonymous,
  });

  await post.save();
  reply.send({ success: true, post });
};

export const getPosts = async (req, reply) => {
  const posts = await Post.find()
    .populate('userId', 'username profileImage')
    .populate('comments')
    .lean();

  reply.send({ success: true, posts });
};
