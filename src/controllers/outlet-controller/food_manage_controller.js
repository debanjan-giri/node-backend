import Joi from "joi";

import {
  inputValidation,
  isValidMongoId,
  removeEmptyFields,
} from "../../utils/utilityFunction.js";
import { foodSchema } from "../../validation/input_schema.js";
import {
  isCategory,
  isFoodType,
  isFoodUnit,
  isId,
  isName,
  isPrice,
  isUrl,
} from "../../validation/atomicSchema.js";
import categoryModel from "../../models/outlet-model/category_model.js";
import foodModel from "../../models/outlet-model/food_model.js";
import { errMiddleware, okResponse } from "../../utils/reqResFunction.js";
// export const addFoodController = async (req, res, next) => {
//   try {
//     const tokenId = req?.userData?._id;
//     if (!tokenId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     const validatedData = inputValidation({
//       data: req.body,
//       next,
//       schema: foodSchema,
//     });

//     if (!validatedData) return;

//     const {
//       foodName,
//       foodImage,
//       foodPrice,
//       foodDesription,
//       categoryId,
//       foodType,
//       outletId,
//     } = validatedData;

//     const findExistingFood = await foodModel.findOne({
//       foodName,
//       outletId: tokenId,
//     });

//     if (findExistingFood) {
//       return errMiddleware({
//         next,
//         error: "Food already exists",
//         statusCode: 400,
//       });
//     }

//     const newFood = await foodModel.create({
//       foodName,
//       foodImage,
//       foodPrice,
//       foodDesription,
//       categoryId,
//       foodType,
//       outletId,
//     });

//     if (!newFood) {
//       return errMiddleware({
//         next,
//         error: "Failed to add food",
//         statusCode: 500,
//       });
//     }

//     return okResponse({
//       response: res,
//       message: "Food item added successfully",
//     });
//   } catch (error) {
//     return errMiddleware({ next, error, controller: "addFoodController" });
//   }
// };

export const addFoodController = async (req, res, next) => {
  try {
    const outletId = req?.userData?._id;
    if (!outletId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation
    const { foodName, foodPrice, foodType, categoryId } = req.body;

    if (!foodName || !foodPrice || !foodType || !categoryId) {
      return errMiddleware({
        next,
        error:
          "Missing required fields: foodName, foodPrice, foodType, categoryId",
        statusCode: 400,
      });
    }

    // Validate food type
    if (!["veg", "non-veg", "vegan"].includes(foodType)) {
      return errMiddleware({
        next,
        error: "Food type must be one of: veg, non-veg, vegan",
        statusCode: 400,
      });
    }

    // Simple regex validation for categoryId
    if (!/^[0-9a-fA-F]{24}$/.test(categoryId)) {
      return errMiddleware({
        next,
        error: "Invalid category ID format",
        statusCode: 400,
      });
    }

    // Check for duplicate food
    const existingFood = await foodModel
      .findOne({
        foodName,
        outletId,
      })
      .select("_id")
      .lean();

    if (existingFood) {
      return errMiddleware({
        next,
        error: "Food already exists",
        statusCode: 400,
      });
    }

    // Create food with minimal fields
    const newFood = await foodModel.create({
      foodName,
      foodPrice,
      foodType,
      categoryId,
      outletId,
    });

    return okResponse({
      response: res,
      message: "Food item added successfully",
      data: { id: newFood._id },
    });
  } catch (error) {
    return errMiddleware({ next, error, controller: "addFoodController" });
  }
};

export const foodDetailsByIdController = async (req, res, next) => {
  try {
    const tokenId = req?.userData?._id;
    const { foodId } = req.params;

    if (!tokenId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation
    if (!foodId) {
      return errMiddleware({
        next,
        error: "Food ID is required",
        statusCode: 400,
      });
    }

    // Simple regex validation
    if (!/^[0-9a-fA-F]{24}$/.test(foodId)) {
      return errMiddleware({
        next,
        error: "Invalid food ID format",
        statusCode: 400,
      });
    }

    // Query with minimal fields
    const foodItem = await foodModel
      .findOne({ _id: foodId })
      .select("foodName foodPrice foodType foodStatus")
      .lean();

    if (!foodItem) {
      return errMiddleware({
        next,
        error: "Food item not found",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Food item details fetched successfully",
      data: foodItem,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "foodDetailsByIdController",
    });
  }
};

export const removeFoodByIdController = async (req, res, next) => {
  try {
    const outletId = req?.userData?._id;
    if (!outletId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation
    const { foodId } = req.body;
    if (!foodId) {
      return errMiddleware({
        next,
        error: "Food ID is required",
        statusCode: 400,
      });
    }

    // Simple regex validation
    if (!/^[0-9a-fA-F]{24}$/.test(foodId)) {
      return errMiddleware({
        next,
        error: "Invalid food ID format",
        statusCode: 400,
      });
    }

    // Delete food directly
    const result = await foodModel.deleteOne({
      _id: foodId,
      outletId: outletId,
    });

    if (result.deletedCount === 0) {
      return errMiddleware({
        next,
        error: "Food item not found or does not belong to this outlet",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Food item removed successfully",
    });
  } catch (error) {
    return errMiddleware({ next, error, controller: "removeFoodController" });
  }
};

export const updateFoodByIdController = async (req, res, next) => {
  try {
    const outletId = req?.userData?._id;
    if (!outletId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation
    const { foodId, foodName, foodPrice, foodType } = req.body;

    if (!foodId) {
      return errMiddleware({
        next,
        error: "Food ID is required",
        statusCode: 400,
      });
    }

    // Simple regex validation
    if (!/^[0-9a-fA-F]{24}$/.test(foodId)) {
      return errMiddleware({
        next,
        error: "Invalid food ID format",
        statusCode: 400,
      });
    }

    // Create update object with only provided fields
    const updateFields = {};
    if (foodName) updateFields.foodName = foodName;
    if (foodPrice) updateFields.foodPrice = foodPrice;
    if (foodType && ["veg", "non-veg", "vegan"].includes(foodType)) {
      updateFields.foodType = foodType;
    }

    // Only update if there are fields to update
    if (Object.keys(updateFields).length === 0) {
      return errMiddleware({
        next,
        error: "No valid fields to update",
        statusCode: 400,
      });
    }

    // Simple update without returning the document
    const result = await foodModel.updateOne(
      { _id: foodId, outletId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return errMiddleware({
        next,
        error: "Food item not found or does not belong to this outlet",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Food item updated successfully",
    });
  } catch (error) {
    return errMiddleware({ next, error, controller: "updateFoodController" });
  }
};

/**
 * Ultra-optimized food list controller
 * - Minimal query with essential fields only
 * - Simple pagination with reasonable limits
 * - No unnecessary data processing
 */
export const foodListController = async (req, res, next) => {
  try {
    const tokenId = req.userData?._id;
    if (!tokenId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Extract and validate pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20; // Reduced default limit

    // Enforce reasonable limits
    if (page < 1) page = 1;
    if (limit < 1 || limit > 50) limit = 20;

    const skip = (page - 1) * limit;

    // Execute query with minimal fields
    const foodList = await foodModel
      .find({ outletId: tokenId })
      .select("foodName foodPrice foodType")
      .skip(skip)
      .limit(limit)
      .lean();

    // Simplified response without additional processing
    return okResponse({
      response: res,
      message: "Food list retrieved successfully",
      data: {
        items: foodList,
        page: page,
        limit: limit,
      },
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "foodListController",
      statusCode: 500,
    });
  }
};

/**
 * Ultra-optimized food status controller
 * - Simple validation
 * - Minimal database update
 */
export const foodStatusController = async (req, res, next) => {
  try {
    const outletId = req.userData?._id;
    if (!outletId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation
    const { foodId, foodStatus } = req.body;

    if (!foodId) {
      return errMiddleware({
        next,
        error: "Food ID is required",
        statusCode: 400,
      });
    }

    if (!foodStatus || !["available", "unavailable"].includes(foodStatus)) {
      return errMiddleware({
        next,
        error: "Valid food status (available/unavailable) is required",
        statusCode: 400,
      });
    }

    // Simple regex validation
    if (!/^[0-9a-fA-F]{24}$/.test(foodId)) {
      return errMiddleware({
        next,
        error: "Invalid food ID format",
        statusCode: 400,
      });
    }

    // Simple update without returning the document
    const result = await foodModel.updateOne(
      { _id: foodId, outletId },
      { $set: { foodStatus } }
    );

    if (result.matchedCount === 0) {
      return errMiddleware({
        next,
        error: "Food item not found or does not belong to this outlet",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: `Food status updated to ${foodStatus}`,
      data: { success: true },
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "foodStatusController",
      statusCode: 500,
    });
  }
};
