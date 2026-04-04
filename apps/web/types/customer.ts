export interface CustomerProfile {
  _id: string;
  name: string;
  email: string;
}

export interface CustomerProject {
  id: string;
  title: string;
  status:
    | "new"
    | "contacted"
    | "converted"
    | "in_progress"
    | "completed"
    | "closed"
    | "NEW"
    | "CONFIRMED"
    | "COMPLETED";
  date: string;
  value: number;
  businessType: string;
  type?: string;
  result?: string;
  coverImage?: string;
  createdAt?: string;
  proposalUrl?: string;
  files?: string[];
  milestones: {
    key: "planned" | "in_progress" | "delivered";
    title: string;
    status: "PENDING" | "DONE";
    files: string[];
    comments: { text: string; by: string; at: string }[];
    updatedAt: string;
  }[];
}
