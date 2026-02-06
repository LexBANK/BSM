import { listKnowledgeDocs, getKnowledgeDocBySlug } from "../services/knowledgeService.js";

export const listKnowledge = async (req, res, next) => {
  try {
    const docs = await listKnowledgeDocs();
    res.json({ documents: docs, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

export const getKnowledgeBySlug = async (req, res, next) => {
  try {
    const doc = await getKnowledgeDocBySlug(req.params.slug);
    res.json({ document: doc, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};
