import { Schema, model } from "mongoose";

const outletSchema = new Schema(
  {
    outletName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true, // Index for text searches
    },
    outletPhone: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensure phone numbers are unique
      index: true, // Index for lookups by phone
    },
    outletPassword: {
      type: String,
      required: true,
      trim: true,
      select: false, // Don't include password in query results by default
    },
    outLetDetail: { type: String, trim: true },
    outletAddress: { type: String, trim: true },
    outletMapPoint: { type: String, trim: true },
    outletPhotoUrl: { type: String, trim: true },
    outletStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true, // Index for status filtering
    },
    connectedUserList: [
      { type: Schema.Types.ObjectId, ref: "userModel", index: true },
    ],
    categoryIdList: [
      {
        type: Schema.Types.ObjectId,
        ref: "categoryModel",
        index: true, // Index for category lookups
      },
    ],
    isAccess: {
      type: Boolean,
      default: true,
      index: true, // Index for access filtering
    },
    homeDelivery: {
      type: Boolean,
      default: false,
      index: true, // Index for delivery filtering
    },
  },
  {
    timestamps: true,
    // Add optimized options
    toJSON: {
      transform: (_, ret) => {
        delete ret.outletPassword; // Ensure password is never sent to client
        return ret;
      },
    },
    // Add compound indexes for common query patterns
    indexes: [
      // Compound index for status + access (common filtering)
      { outletStatus: 1, isAccess: 1 },
      // Compound index for delivery + status (for finding active delivery outlets)
      { homeDelivery: 1, outletStatus: 1 },
      // Compound index for location-based queries (if you implement geospatial features later)
      { outletStatus: 1, createdAt: -1 },
    ],
  }
);

const outletModel = model("outletModel", outletSchema);
export default outletModel;
