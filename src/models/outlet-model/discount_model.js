import { Schema, model } from "mongoose";

const discountSchema = new Schema(
  {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "outletModel",
      required: true,
      index: true,
    },
    discountFoodId: {
      type: Schema.Types.ObjectId,
      ref: "foodModel",
      required: true,
    },
    discountPercentage: { type: Number, required: true },
    discountStartTime: { type: Date, required: true },
    discountEndTime: { type: Date, required: true },
    isDelivery: {
      type: String,
      required: true,
      enum: ["yes", "no"],
    },
    outletNumber: { type: Number, trim: true },
  },
  { timestamps: true }
);

const discountModel = model("discountModel", discountSchema);
export default discountModel;
