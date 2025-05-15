import { Schema, model } from "mongoose";

const foodSchema = new Schema(
  {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "outletModel",
      index: true, // Index for faster lookups by outlet
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "categoryModel",
      index: true, // Index for faster lookups by category
      required: true,
    },
    foodName: {
      type: String,
      trim: true,
      lowercase: true,
      index: true, // Index for faster text searches
    },
    foodImage: { type: String, trim: true },
    foodPrice: { type: Number },
    foodUnit: { type: String, trim: true },
    foodDesription: { type: String, trim: true },
    foodStatus: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
      index: true, // Index for filtering by status
    },
    foodType: {
      type: String,
      default: "veg",
      index: true, // Index for filtering by food type
    },
  },
  {
    timestamps: true,
    // Add compound indexes for common query patterns
    indexes: [
      // Compound index for outlet + category queries (very common)
      { outletId: 1, categoryId: 1 },
      // Compound index for outlet + status queries
      { outletId: 1, foodStatus: 1 },
      // Compound index for category + status queries
      { categoryId: 1, foodStatus: 1 },
    ],
  }
);

const foodModel = model("foodModel", foodSchema);
export default foodModel;
