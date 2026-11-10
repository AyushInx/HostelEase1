import { prisma } from "../../config/db.js";

export const createPoll = async ({ question, options, pollType = "SINGLE", createdBy }) => {
  const type = String(pollType).toUpperCase() === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
  return prisma.poll.create({
    data: {
      question,
      options, // JSON array
      pollType: type,
      createdBy: Number(createdBy),
    },
    select: { id: true, question: true, options: true, pollType: true, createdBy: true, createdAt: true },
  });
};

export const listPolls = async ({ active = true, page = 1, limit = 50, userId }) => {
  const where = {};
  const [items, total] = await Promise.all([
    prisma.poll.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        votes: {
          select: {
            id: true,
            userId: true,
            option: true,
          },
        },
      },
    }),
    prisma.poll.count({ where }),
  ]);

  const formattedItems = items.map((poll) => {
    const voteCounts = {};
    const myVotesSet = new Set();
    const uniqueVotersSet = new Set();

    (poll.votes || []).forEach((v) => {
      voteCounts[v.option] = (voteCounts[v.option] || 0) + 1;
      uniqueVotersSet.add(v.userId);
      if (Number(v.userId) === Number(userId)) {
        myVotesSet.add(v.option);
      }
    });

    const totalVotes = poll.votes ? poll.votes.length : 0;
    const uniqueVoters = uniqueVotersSet.size;
    const rawOptions = Array.isArray(poll.options) ? poll.options : [];

    const options = rawOptions.map((opt, index) => {
      const count = voteCounts[opt] || 0;
      const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
      return {
        id: index,
        text: opt,
        votes: count,
        percentage,
      };
    });

    const myVotes = Array.from(myVotesSet);
    const hasVoted = myVotes.length > 0;

    return {
      id: poll.id,
      title: poll.question,
      pollType: poll.pollType || "SINGLE",
      description: poll.pollType === "MULTIPLE" ? "Multiple choice poll" : "Single choice poll",
      type: "general",
      options,
      totalVotes,
      uniqueVoters,
      hasVoted,
      myVotes,
      createdAt: poll.createdAt,
    };
  });

  return { items: formattedItems, total, page, limit };
};

export const getPollById = async ({ id, userId }) => {
  const poll = await prisma.poll.findUnique({
    where: { id: Number(id) },
    include: {
      votes: {
        select: {
          id: true,
          userId: true,
          option: true,
        },
      },
    },
  });

  if (!poll) return null;

  const voteCounts = {};
  const myVotesSet = new Set();
  const uniqueVotersSet = new Set();

  (poll.votes || []).forEach((v) => {
    voteCounts[v.option] = (voteCounts[v.option] || 0) + 1;
    uniqueVotersSet.add(v.userId);
    if (userId && Number(v.userId) === Number(userId)) {
      myVotesSet.add(v.option);
    }
  });

  const totalVotes = poll.votes ? poll.votes.length : 0;
  const rawOptions = Array.isArray(poll.options) ? poll.options : [];

  const options = rawOptions.map((opt, index) => {
    const count = voteCounts[opt] || 0;
    const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
    return {
      id: index,
      text: opt,
      votes: count,
      percentage,
    };
  });

  const myVotes = Array.from(myVotesSet);

  return {
    id: poll.id,
    title: poll.question,
    pollType: poll.pollType || "SINGLE",
    description: poll.pollType === "MULTIPLE" ? "Multiple choice poll" : "Single choice poll",
    options,
    totalVotes,
    uniqueVoters: uniqueVotersSet.size,
    hasVoted: myVotes.length > 0,
    myVotes,
    createdAt: poll.createdAt,
  };
};

export const vote = async ({ pollId, userId, selectedOptions }) => {
  const poll = await prisma.poll.findUnique({ where: { id: Number(pollId) } });
  if (!poll) {
    const e = new Error("Poll not found");
    e.status = 404;
    throw e;
  }

  // Check if student has already voted
  const existingVotes = await prisma.pollVote.findMany({
    where: { pollId: Number(pollId), userId: Number(userId) },
  });
  if (existingVotes.length > 0) {
    const e = new Error("You have already voted on this poll. Cancel your vote first to change it.");
    e.status = 409;
    throw e;
  }

  const validOpts = Array.isArray(poll.options) ? poll.options : [];
  const pollType = poll.pollType || "SINGLE";

  // Normalize selectedOptions: array of strings
  let optionsToCast = [];
  if (Array.isArray(selectedOptions)) {
    optionsToCast = selectedOptions.map((o) => String(o).trim()).filter(Boolean);
  } else if (typeof selectedOptions === "string" && selectedOptions.trim()) {
    optionsToCast = [selectedOptions.trim()];
  }

  // Remove duplicates
  optionsToCast = Array.from(new Set(optionsToCast));

  if (optionsToCast.length === 0) {
    const e = new Error("Please select at least one option to vote.");
    e.status = 400;
    throw e;
  }

  if (pollType === "SINGLE" && optionsToCast.length > 1) {
    const e = new Error("This is a single choice poll. You can only select one option.");
    e.status = 400;
    throw e;
  }

  // Verify all chosen options are valid
  for (const opt of optionsToCast) {
    if (!validOpts.includes(opt)) {
      const e = new Error(`Invalid option selected: "${opt}"`);
      e.status = 400;
      throw e;
    }
  }

  // Insert votes
  const data = optionsToCast.map((opt) => ({
    pollId: Number(pollId),
    userId: Number(userId),
    option: opt,
  }));

  await prisma.pollVote.createMany({ data });
  return { success: true, count: optionsToCast.length };
};

export const cancelVote = async ({ pollId, userId }) => {
  const existingVotes = await prisma.pollVote.findMany({
    where: { pollId: Number(pollId), userId: Number(userId) },
  });

  if (existingVotes.length === 0) {
    const e = new Error("You have not voted on this poll yet.");
    e.status = 404;
    throw e;
  }

  await prisma.pollVote.deleteMany({
    where: { pollId: Number(pollId), userId: Number(userId) },
  });

  return { success: true, removedCount: existingVotes.length };
};

export const results = async ({ id }) => {
  const poll = await prisma.poll.findUnique({
    where: { id: Number(id) },
    include: {
      votes: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              hostel: true,
              block: true,
              roomNumber: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!poll) {
    const e = new Error("Poll not found");
    e.status = 404;
    throw e;
  }

  const rawOptions = Array.isArray(poll.options) ? poll.options : [];
  const optionVotesMap = {};
  const optionVotersMap = {};
  const uniqueVoterIds = new Set();

  rawOptions.forEach((opt) => {
    optionVotesMap[opt] = 0;
    optionVotersMap[opt] = [];
  });

  (poll.votes || []).forEach((v) => {
    optionVotesMap[v.option] = (optionVotesMap[v.option] || 0) + 1;
    uniqueVoterIds.add(v.userId);
    if (!optionVotersMap[v.option]) {
      optionVotersMap[v.option] = [];
    }
    if (v.user) {
      optionVotersMap[v.option].push({
        id: v.user.id,
        name: v.user.name,
        email: v.user.email,
        hostel: v.user.hostel,
        block: v.user.block,
        roomNumber: v.user.roomNumber,
      });
    }
  });

  const totalVotes = poll.votes ? poll.votes.length : 0;
  const uniqueVoters = uniqueVoterIds.size;
  const maxVotes = Math.max(0, ...Object.values(optionVotesMap));

  const optionsAnalytics = rawOptions.map((opt) => {
    const count = optionVotesMap[opt] || 0;
    const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
    return {
      option: opt,
      votes: count,
      percentage,
      isLeading: count === maxVotes && maxVotes > 0,
      voters: optionVotersMap[opt] || [],
    };
  });

  return {
    poll: {
      id: poll.id,
      question: poll.question,
      pollType: poll.pollType || "SINGLE",
      createdAt: poll.createdAt,
    },
    totalVotes,
    uniqueVoters,
    options: optionsAnalytics,
  };
};

export const deletePoll = async ({ id }) => {
  await prisma.pollVote.deleteMany({ where: { pollId: Number(id) } });
  return prisma.poll.delete({ where: { id: Number(id) }, select: { id: true } });
};
