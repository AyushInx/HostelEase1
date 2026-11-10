import * as PollsService from "./polls.service.js";

export const createPoll = async (req, res) => {
  const userId = req.user.id;
  const { question, options, pollType } = req.body || {};
  if (!question || !Array.isArray(options) || options.length < 2) {
    const e = new Error("Question and at least two options are required");
    e.status = 400;
    throw e;
  }
  const created = await PollsService.createPoll({
    question: question.trim(),
    options,
    pollType,
    createdBy: userId,
  });
  res.json(created);
};

export const listPolls = async (req, res) => {
  const { active = "true", page = 1, limit = 50 } = req.query;
  const userId = req.user?.id;
  const data = await PollsService.listPolls({
    active: String(active) === "true",
    page: Number(page),
    limit: Number(limit),
    userId,
  });
  res.json(data);
};

export const getPollById = async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.id;
  const poll = await PollsService.getPollById({ id, userId });
  if (!poll) {
    const e = new Error("Poll not found");
    e.status = 404;
    throw e;
  }
  res.json(poll);
};

export const vote = async (req, res) => {
  const pollId = Number(req.params.pollId);
  const userId = req.user.id;
  const { option, options } = req.body || {};
  const selectedOptions = options !== undefined ? options : option;

  if (!selectedOptions || (Array.isArray(selectedOptions) && selectedOptions.length === 0)) {
    const e = new Error("Please select an option to vote");
    e.status = 400;
    throw e;
  }

  const result = await PollsService.vote({ pollId, userId, selectedOptions });
  res.json(result);
};

export const cancelVote = async (req, res) => {
  const pollId = Number(req.params.pollId);
  const userId = req.user.id;
  const result = await PollsService.cancelVote({ pollId, userId });
  res.json(result);
};

export const results = async (req, res) => {
  const id = Number(req.params.id);
  const data = await PollsService.results({ id });
  res.json(data);
};

export const deletePoll = async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await PollsService.deletePoll({ id });
  res.json(deleted);
};
