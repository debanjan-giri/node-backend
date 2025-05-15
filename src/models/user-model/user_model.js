import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
      index: true, // Index for text searches
    },
    userPhone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true, // Already indexed for unique constraint
    },
    userPassword: {
      type: String,
      required: true,
      trim: true,
      select: false, // Don't include password in query results by default
    },
    userPhoto: { type: String, required: true, trim: true },
    connectedOutletId: [
      {
        type: Schema.Types.ObjectId,
        ref: "outletModel",
        index: true, // Already indexed
      },
    ],
    foodSavedCount: {
      type: Number,
      default: 0,
    },
    userStatus: {
      type: String,
      enum: ["offline", "online"],
      default: "online",
      index: true, // Index for status filtering
    },
    isNewOutletUser: {
      type: Boolean,
      enum: [true, false],
      default: false,
      index: true, // Index for filtering new users
    },
  },
  {
    timestamps: true,
    // Add optimized options
    toJSON: {
      transform: (_, ret) => {
        delete ret.userPassword; // Ensure password is never sent to client
        return ret;
      },
    },
    // Add compound indexes for common query patterns
    indexes: [
      // Compound index for status + creation date (for finding recent active users)
      { userStatus: 1, createdAt: -1 },
      // Compound index for new users + creation date
      { isNewOutletUser: 1, createdAt: -1 },
    ],
  }
);

const userModel = model("userModel", userSchema);

export default userModel;
