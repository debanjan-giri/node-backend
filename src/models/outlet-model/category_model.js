import { Schema, model } from "mongoose";

const categorySchema = new Schema(
  {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "outletModel",
      required: true,
      index: true, // Index for faster lookups by outlet
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true, // Index for faster text searches
    },
    categoryImage: { type: String, required: true, trim: true },
    categoryStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
      index: true, // Index for filtering by status
    },

    // order part
    isOpen: {
      type: String,
      enum: ["open", "close"],
      default: "close",
      index: true, // Already indexed
    },
    todayDate: {
      type: Date,
      default: () => Date.now(),
      index: true, // Index for date-based queries
    },
    totalOrders: { type: Number, default: 0 },
    oldUser: { type: Number, default: 0 },
    foodList: [
      {
        foodId: {
          type: Schema.Types.ObjectId,
          ref: "foodModel",
          index: true, // Already indexed
        },
        orderCount: { type: Number, default: 0 },
        userList: [
          {
            type: Schema.Types.ObjectId,
            ref: "userModel",
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
    // Add compound indexes for common query patterns
    indexes: [
      // Compound index for outlet + status queries
      { outletId: 1, categoryStatus: 1 },
      // Compound index for outlet + isOpen queries
      { outletId: 1, isOpen: 1 },
      // Compound index for date-based queries
      { outletId: 1, todayDate: -1 },
    ],
  }
);

const categoryModel = model("categoryModel", categorySchema);
export default categoryModel;
