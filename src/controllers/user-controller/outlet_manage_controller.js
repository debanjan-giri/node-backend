import userModel from "../../models/user-model/user_model.js";
import categoryModel from "../../models/outlet-model/category_model.js";
import Joi from "joi";
import { isId } from "../../validation/atomicSchema.js";
import outletModel from "../../models/outlet-model/outlet_model.js";
import { errMiddleware, okResponse } from "../../utils/reqResFunction.js";
import { inputValidation } from "../../utils/utilityFunction.js";

export const connectUserToOutletController = async (req, res, next) => {
  try {
    const userDetails = req?.userData; // Get user ID from token

    if (!userDetails) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Validate input
    const validatedData = inputValidation({
      data: req.body,
      next,
      schema: Joi.object({
        outletId: isId.required(),
        action: Joi.string().valid("connect", "disconnect").required(),
      }),
    });

    if (!validatedData) return;

    const { outletId, action } = validatedData;

    const checkOutletId = isValidMongoId({ next, id: outletId });
    if (!checkOutletId) return;

    // Check if outlet exists
    const outletExists = await outletModel.findById(checkOutletId);
    if (!outletExists) {
      return errMiddleware({
        next,
        error: "Outlet not found",
        statusCode: 404,
      });
    }

    // **Check if user is already connected**
    const isUserConnected =
      userDetails.connectedOutletId.includes(checkOutletId);

    if (action === "connect") {
      if (isUserConnected) {
        return errMiddleware({
          next,
          error: "User already connected to this outlet",
          statusCode: 409,
        });
      }

      // Connect user to outlet
      const [updateUser, updateOutlet] = await Promise.all([
        userModel.findByIdAndUpdate(userDetails._id, {
          $push: { connectedOutletId: outletId },
        }),
        outletModel.findByIdAndUpdate(outletId, {
          $push: { connectedUserList: userDetails._id },
        }),
      ]);

      if (!updateUser || !updateOutlet) {
        return errMiddleware({
          next,
          error: "Failed to connect user to outlet",
          statusCode: 500,
        });
      }

      return okResponse({
        response: res,
        message: "User successfully connected to outlet",
      });
    } else if (action === "disconnect") {
      if (!isUserConnected) {
        return errMiddleware({
          next,
          error: "User is not connected to this outlet",
          statusCode: 400,
        });
      }

      // Disconnect user from outlet
      const [updateUser, updateOutlet] = await Promise.all([
        userModel.findByIdAndUpdate(userDetails._id, {
          $pull: { connectedOutletId: outletId },
        }),
        outletModel.findByIdAndUpdate(outletId, {
          $pull: { connectedUserList: userDetails._id },
        }),
      ]);

      if (!updateUser || !updateOutlet) {
        return errMiddleware({
          next,
          error: "Failed to disconnect user from outlet",
          statusCode: 500,
        });
      }

      return okResponse({
        response: res,
        message: "User successfully disconnected from outlet",
      });
    }
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "connectUserToOutletController",
    });
  }
};

export const getUserConnectedOutletsController = async (req, res, next) => {
  try {
    const userId = req?.userData?._id; // Get user ID from token

    if (!userId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    const user = await userModel
      .findById(userId)
      .populate({
        path: "connectedOutletId",
        select:
          "outletName outletPhone outletPhotoUrl outletAddress categoryId",
      })
      .lean();

    if (!user) {
      return errMiddleware({
        next,
        error: "User not found",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Connected outlets retrieved successfully",
      data: user.connectedOutletId,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getUserConnectedOutletsController",
    });
  }
};

export const getOutletDetailsByIdController = async (req, res, next) => {
  try {
    const userId = req?.userData?._id;
    const { id: outletId } = req.params;

    if (!userId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Validate outlet ID
    const validOutletId = isValidMongoId({ next, id: outletId });
    if (!validOutletId) return;

    const [isUserConnected, isOutletConnected] = await Promise.all([
      userModel.findOne({ _id: userId, connectedOutletId: outletId }),
      outletModel.findOne({ _id: outletId, connectedUserList: userId }),
    ]);

    if (!isUserConnected && !isOutletConnected) {
      return errMiddleware({
        next,
        error: "You are not connected to this outlet",
        statusCode: 400,
      });
    }

    // Fetch outlet details without population
    const outletDetails = await outletModel
      .findById(validOutletId)
      .select(
        "outletName outletPhone outletPhotoUrl outletAddress outLetDetail homeDelivery"
      )
      .lean();

    return okResponse({
      response: res,
      message: "Outlet details retrieved successfully",
      data: outletDetails,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getOutletDetailsController",
    });
  }
};

export const getOutletCategoryListController = async (req, res, next) => {
  try {
    const { id: outletId } = req.params;

    // Validate outletId
    const validOutletId = isValidMongoId({ next, id: outletId });
    if (!validOutletId) return;

    // Check if the outlet exists
    const outlet = await outletModel.findById(validOutletId).lean();
    if (!outlet) {
      return errMiddleware({
        next,
        error: "Outlet not found",
        statusCode: 404,
      });
    }

    // Fetch categories by outlet categoryIdList (Only _id & categoryName)
    const categories = await categoryModel
      .find({ _id: { $in: outlet.categoryIdList } }, "categoryName")
      .lean();

    return okResponse({
      response: res,
      message: "Category list retrieved successfully",
      data: categories,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getOutletCategoryListController",
    });
  }
};

export const getCategoryWiseFoodController = async (req, res, next) => {
  try {
    const validatedData = inputValidation({
      data: req.body,
      next,
      schema: Joi.object({
        categoryId: Joi.string().required(),
      }),
    });

    if (!validatedData) return;

    const { categoryId } = validatedData;

    // Validate categoryId
    const validCategoryId = isValidMongoId({ next, id: categoryId });
    if (!validCategoryId) return;

    // Find the category and fetch its food list
    const category = await categoryModel
      .findById(validCategoryId)
      .select("categoryName foodList")
      .populate({
        path: "foodList",
        select: "foodName foodPrice foodPhotoUrl foodStatus",
      })
      .lean();

    if (!category) {
      return errMiddleware({
        next,
        error: "Category not found",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Food list retrieved successfully",
      data: {
        categoryName: category.categoryName,
        foodList: category.foodList,
      },
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getCategoryWiseFoodController",
    });
  }
};
