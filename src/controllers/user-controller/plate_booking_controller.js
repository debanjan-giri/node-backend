import categoryModel from "../../models/outlet-model/category_model";
import outletModel from "../../models/outlet-model/outlet_model";
import userModel from "../../models/user-model/user_model";

export const getActiveCategoryController = async (req, res, next) => {
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

    // Find active category IDs for the given outlet
    const activeCategories = await categoryModel
      .find({ outletId: validOutletId, isOpen: "open" })
      .select("_id, categoryName")
      .lean();

    if (!activeCategories.length) {
      return errMiddleware({
        next,
        error: "No active categories found",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Active category IDs retrieved successfully",
      data: {
        categories: activeCategories.map((category) => {
          return {
            _id: category._id,
            categoryName: category.categoryName,
          };
        }),
        alert: "true",
      },
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getActiveCategoryController",
    });
  }
};

export const foodPickedController = async (req, res, next) => {
  try {
    const { foodIds, categoryId, outletId } = req.body; // foodIds should be an array
    const userId = req?.userData?._id;

    // Validate user authentication
    if (!userId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Validate input
    const validData = inputValidation({
      data: req.body,
      next,
      schema: Joi.object({
        foodIds: Joi.array().items(isId.required()).min(1).required(), // Expecting an array of foodIds
        categoryId: isId.required(),
        outletId: isId.required(),
      }),
    });

    if (!validData) return;

    // Validate MongoDB ObjectIDs
    const validCategoryId = isValidMongoId({ next, id: categoryId });
    const validOutletId = isValidMongoId({ next, id: outletId });

    if (!validCategoryId || !validOutletId) return;

    // Find the category and check if it belongs to the given outlet
    const category = await categoryModel.findOne({
      _id: validCategoryId,
      outletId: validOutletId,
    });

    const userDetails = await userModel.findById(userId);

    if (!userDetails) {
      return errMiddleware({
        next,
        error: "User not found",
        statusCode: 404,
      });
    }

    if (!category) {
      return errMiddleware({
        next,
        error: "Category not found or does not belong to this outlet",
        statusCode: 404,
      });
    }

    let updated = false; // To track if any food was successfully picked

    // Process each foodId
    foodIds.forEach((foodId) => {
      const validFoodId = isValidMongoId({ next, id: foodId });
      if (!validFoodId) return; // Skip invalid IDs

      // Find the food in the category
      const foodIndex = category.foodList.findIndex(
        (food) => food.foodId.toString() === validFoodId
      );

      if (foodIndex === -1) return; // Skip if food not found

      // Check if the user has already picked this food
      const alreadyPicked = category.foodList[foodIndex].userList.some(
        (user) => user.toString() === userId
      );

      if (!alreadyPicked) {
        // Update category model
        category.foodList[foodIndex].userList.push(userId);
        category.foodList[foodIndex].orderCount += 1;
        updated = true;
      }
    });

    if (!updated) {
      return errMiddleware({
        next,
        error: "No new food items were picked (maybe already selected)",
        statusCode: 409,
      });
    }

    // Update category totals
    category.totalOrders += foodIds.length;
    if (!userDetails.isNewOutletUser) {
      category.oldUser += 1;
    }
    // Save the updated category
    await category.save();

    return okResponse({
      response: res,
      message: "Food picked successfully",
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "foodPickedController",
    });
  }
};

export const foodUnpickedController = async (req, res, next) => {
  try {
    const { foodIds, categoryId, outletId } = req.body;
    const userId = req?.userData?._id;

    // Validate user authentication
    if (!userId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Validate input
    const validData = inputValidation({
      data: req.body,
      next,
      schema: Joi.object({
        foodIds: Joi.array().items(isId.required()).min(1).required(), // Expecting an array of foodIds
        categoryId: isId.required(),
        outletId: isId.required(),
      }),
    });

    if (!validData) return;

    // Validate MongoDB ObjectIDs
    const validCategoryId = isValidMongoId({ next, id: categoryId });
    const validOutletId = isValidMongoId({ next, id: outletId });

    if (!validCategoryId || !validOutletId) return;

    // Find the category
    const category = await categoryModel.findOne({
      _id: validCategoryId,
      outletId: validOutletId,
    });

    if (!category) {
      return errMiddleware({
        next,
        error: "Category not found or does not belong to this outlet",
        statusCode: 404,
      });
    }

    let updated = false; // To track if any food was successfully unpicked

    // Process each foodId
    foodIds.forEach((foodId) => {
      const validFoodId = isValidMongoId({ next, id: foodId });
      if (!validFoodId) return; // Skip invalid IDs

      // Find the food in the category
      const foodIndex = category.foodList.findIndex(
        (food) => food.foodId.toString() === validFoodId
      );

      if (foodIndex === -1) return; // Skip if food not found

      // Check if the user has picked this food
      const userIndex = category.foodList[foodIndex].userList.findIndex(
        (user) => user.toString() === userId
      );

      if (userIndex !== -1) {
        // Remove user from the food's userList
        category.foodList[foodIndex].userList.splice(userIndex, 1);

        // Reduce order count but ensure it doesn't go below 0
        category.foodList[foodIndex].orderCount = Math.max(
          category.foodList[foodIndex].orderCount - 1,
          0
        );

        updated = true;
      }
    });

    if (!updated) {
      return errMiddleware({
        next,
        error: "No selected food items were unpicked",
        statusCode: 409,
      });
    }

    // Reduce totalOrders count but ensure it doesn't go below 0
    category.totalOrders = Math.max(category.totalOrders - foodIds.length, 0);

    // Save the updated category
    await category.save();

    return okResponse({
      response: res,
      message: "Food unpicked successfully",
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "foodUnpickedController",
    });
  }
};

export const lazyUserVisitController = async (req, res, next) => {
  try {
    const { categoryId, outletId, action } = req.body;
    const userId = req?.userData?._id;

    // Validate user authentication
    if (!userId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Validate input
    const validData = inputValidation({
      data: req.body,
      next,
      schema: Joi.object({
        categoryId: isId.required(),
        outletId: isId.required(),
        action: Joi.string().valid("yes", "no").required(),
      }),
    });

    if (!validData) return;

    if (action === "no") {
      return okResponse({
        response: res,
        message: "No action taken",
      });
    }

    // Validate MongoDB ObjectIDs
    const validCategoryId = isValidMongoId({ next, id: categoryId });
    const validOutletId = isValidMongoId({ next, id: outletId });

    if (!validCategoryId || !validOutletId) return;

    // Find the category
    const category = await categoryModel.findOne({
      _id: validCategoryId,
      outletId: validOutletId,
    });

    if (!category) {
      return errMiddleware({
        next,
        error: "Category not found or does not belong to this outlet",
        statusCode: 404,
      });
    }

    // Get user details
    const userDetails = await userModel.findById(userId);

    if (!userDetails) {
      return errMiddleware({
        next,
        error: "User not found",
        statusCode: 404,
      });
    }

    // Update category visit counts
    category.totalOrders += 1;
    if (!userDetails.isNewOutletUser) {
      category.oldUser += 1;
    }

    // Save updates
    await category.save();

    return okResponse({
      response: res,
      message: "User visit recorded successfully",
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "lazyUserVisitController",
    });
  }
};
