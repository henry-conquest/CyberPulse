export interface AnalystComment {
  comment: string;
  author: string;
  date: string;
}

export interface PreviousComment {
  date: string;
  note: string;
}

export interface AnalystCommentsProps {
  latest: AnalystComment;
  previous: PreviousComment[];
}
