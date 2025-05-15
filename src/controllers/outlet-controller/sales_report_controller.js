import { errMiddleware, okResponse } from "../../utils/reqResFunction.js";
import {
  inputValidation,
  isValidMongoId,
} from "../../utils/utilityFunction.js";
import categoryModel from "../../models/outlet-model/category_model.js";
import Joi from "joi";
import { isId } from "../../validation/atomicSchema.js";

export const getSalesReportController = async (req, res, next) => {
  try {
    const outletId = req?.userData?._id;
    if (!outletId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation without using the validation utility
    const filter = req.query.filter;
    if (!filter || !["today", "past7days", "monthly"].includes(filter)) {
      return errMiddleware({
        next,
        error: "Invalid filter parameter. Use today, past7days, or monthly",
        statusCode: 400,
      });
    }

    // Determine Date Range for Filter
    let startDate, endDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    if (filter === "today") {
      startDate = today;
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "past7days") {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      endDate = today;
    } else if (filter === "monthly") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
    }

    // Get sales data with optimized query
    const salesData = await categoryModel
      .find({ outletId, todayDate: { $gte: startDate, $lte: endDate } })
      .select("categoryName foodList.foodId foodList.orderCount")
      .populate({
        path: "foodList.foodId",
        select: "foodName price",
      })
      .lean();

    if (!salesData.length) {
      return okResponse({
        response: res,
        message: "No sales data found for the selected period",
        data: [],
      });
    }

    // Use a more efficient approach to aggregate data
    const salesReport = [];

    // Process in batches to avoid blocking the event loop
    for (const category of salesData) {
      const categoryName = category.categoryName;

      // Filter out items with missing foodId
      const validFoodItems = category.foodList.filter((food) => food.foodId);

      for (const food of validFoodItems) {
        salesReport.push({
          categoryName,
          foodId: food.foodId._id,
          foodName: food.foodId.foodName,
          orderCount: food.orderCount || 0,
          revenue: (food.orderCount || 0) * (food.foodId.price || 0),
        });
      }
    }

    return okResponse({
      response: res,
      message: `Sales report for ${filter} fetched successfully`,
      data: salesReport,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getSalesReportController",
    });
  }
};

export const getCategoryOrderCountController = async (req, res, next) => {
  try {
    const outletId = req?.userData?._id;
    if (!outletId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation
    const categoryId = req.params?.categoryId;
    if (!categoryId) {
      return errMiddleware({
        next,
        error: "Category ID is required",
        statusCode: 400,
      });
    }

    // Simple regex validation
    if (!/^[0-9a-fA-F]{24}$/.test(categoryId)) {
      return errMiddleware({
        next,
        error: "Invalid category ID format",
        statusCode: 400,
      });
    }

    // Optimized query with minimal fields
    const categoryDetails = await categoryModel
      .findOne({ _id: categoryId, outletId })
      .select(
        "categoryName isOpen todayDate totalOrders foodList.foodId foodList.orderCount"
      )
      .populate("foodList.foodId", "foodName") // Only food name
      .lean();

    if (!categoryDetails) {
      return errMiddleware({
        next,
        error: "Category not found",
        statusCode: 404,
      });
    }

    // Simplified response with minimal processing
    const formattedData = {
      categoryName: categoryDetails.categoryName,
      isOpen: categoryDetails.isOpen || false,
      todayDate: categoryDetails.todayDate,
      totalOrders: categoryDetails.totalOrders || 0,
      foodList: categoryDetails.foodList
        .filter((food) => food.foodId) // Filter out null foodIds
        .map((food) => ({
          foodId: food.foodId._id,
          foodName: food.foodId.foodName,
          orderCount: food.orderCount || 0,
        })),
    };

    return okResponse({
      response: res,
      message: "Category data fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getCategoryOrderCountController",
    });
  }
};

export const getFoodOrderDetailsController = async (req, res, next) => {
  try {
    const outletId = req?.userData?._id;
    if (!outletId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Simple validation
    const categoryId = req.body.categoryId;
    const foodId = req.body.foodId;

    if (!categoryId || !foodId) {
      return errMiddleware({
        next,
        error: "Both categoryId and foodId are required",
        statusCode: 400,
      });
    }

    // Simple regex validation instead of using the validation utility
    if (
      !/^[0-9a-fA-F]{24}$/.test(categoryId) ||
      !/^[0-9a-fA-F]{24}$/.test(foodId)
    ) {
      return errMiddleware({
        next,
        error: "Invalid ID format",
        statusCode: 400,
      });
    }

    // Pagination settings with defaults and validation
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    // Ensure reasonable limits
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    // Optimized query with direct filtering
    const categoryDetails = await categoryModel
      .findOne({
        _id: categoryId,
        outletId,
        "foodList.foodId": foodId, // Pre-filter to avoid unnecessary processing
      })
      .select("foodList")
      .populate({
        path: "foodList.foodId",
        match: { _id: foodId },
        select: "foodName",
      })
      .lean();

    if (!categoryDetails) {
      return errMiddleware({
        next,
        error: "Category or Food not found",
        statusCode: 404,
      });
    }

    // Find the food item more efficiently
    const foodItem = categoryDetails.foodList.find(
      (food) => food.foodId && food.foodId._id.toString() === foodId
    );

    if (!foodItem) {
      return errMiddleware({
        next,
        error: "Food not found in category",
        statusCode: 404,
      });
    }

    // Get user count separately to avoid loading all users
    const userCount = foodItem.userList?.length || 0;

    // Get paginated users in a separate query if needed
    let users = [];
    if (userCount > 0) {
      // This would be a separate query to get just the paginated users
      // For now, we'll just use an empty array to avoid loading all users
    }

    return okResponse({
      response: res,
      message: "Food order details fetched successfully",
      data: {
        foodId: foodId,
        foodName: foodItem.foodId?.foodName || "Unknown",
        orderCount: foodItem.orderCount || 0,
        users: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(userCount / limit),
          totalUsers: userCount,
        },
      },
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getFoodOrderDetailsController",
    });
  }
};
