import Message from '../models/Message.js';

export const sendMessage = async (req, res) => {
  const { receiver, text, fileUrl = '' } = req.body;
  const msg = await Message.create({ sender: req.user.userId, receiver, text, fileUrl });
  res.status(201).json(msg);
};

export const getConversation = async (req, res) => {
  const peerId = req.params.userId;
  const me = req.user.userId;
  const messages = await Message.find({
    $or: [
      { sender: me, receiver: peerId },
      { sender: peerId, receiver: me }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
};
