export type CommentVerdict = 'fact' | 'fake';

export type VoteValue = 'real' | 'fake';

export type Comment = {
  id: string;
  authorUid: string;
  authorEmail: string;
  authorVerified: boolean;
  text: string;
  verdict: CommentVerdict | null;
  createdAt: string;
  realVotes: number;
  fakeVotes: number;
  myVote?: VoteValue | null;
  pending?: boolean;
};

export type CommunityStats = {
  realVotes: number;
  fakeVotes: number;
  totalVotes: number;
  realPercent: number;
  fakePercent: number;
  commentCount: number;
};

export const computeStats = (comments: Comment[]): CommunityStats => {
  const realVotes = comments.reduce((sum, comment) => sum + comment.realVotes, 0);
  const fakeVotes = comments.reduce((sum, comment) => sum + comment.fakeVotes, 0);
  const totalVotes = realVotes + fakeVotes;

  return {
    commentCount: comments.length,
    fakePercent: totalVotes ? Math.round((fakeVotes / totalVotes) * 100) : 0,
    fakeVotes,
    realPercent: totalVotes ? Math.round((realVotes / totalVotes) * 100) : 0,
    realVotes,
    totalVotes,
  };
};
