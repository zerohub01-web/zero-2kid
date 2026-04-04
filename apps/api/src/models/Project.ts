import mongoose, { Schema } from "mongoose";

export type ProjectStatus = "new" | "contacted" | "converted" | "in_progress" | "completed";

export interface ProjectDocument extends mongoose.Document {
  clientId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  status: ProjectStatus;
  timeline: string;
  files: string[];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "in_progress", "completed"],
      default: "converted"
    },
    timeline: { type: String, trim: true, default: "Kickoff scheduled" },
    files: { type: [String], default: [] }
  },
  { timestamps: true }
);

projectSchema.index({ clientId: 1, createdAt: -1 });
projectSchema.index({ status: 1, createdAt: -1 });

export const ProjectModel = mongoose.model<ProjectDocument>("Project", projectSchema);
