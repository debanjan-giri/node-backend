// import {
//   inputValidation,
//   isValidMongoId,
// } from "../../utils/utilityFunction.js";
// import { isId, isName, isUrl } from "../../validation/atomicSchema.js";
// import foodModel from "../../models/outlet-model/food_model.js";

// import categoryModel from "../../models/outlet-model/category_model.js";
// import outletModel from "../../models/outlet-model/outlet_model.js";
// import { errMiddleware, okResponse } from "../../utils/reqResFunction.js";
// import Joi from "joi";

// export const categoryAddController = async (req, res, next) => {
//   try {
//     const outletId = req?.userData?._id;
//     const { categoryName, categoryImage } = req.body;

//     if (!outletId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     // Validate the input for category
//     const validatedData = inputValidation({
//       data: { categoryName, categoryImage },
//       next,
//       schema: Joi.object({
//         categoryName: isName.required(),
//         categoryImage: isUrl.required(),
//       }),
//     });

//     if (!validatedData) return;

//     const existingCategory = await categoryModel.findOne({
//       categoryName: validatedData.categoryName,
//       outletId,
//     });
//     if (existingCategory) {
//       return errMiddleware({
//         next,
//         error: "Category already exists",
//         statusCode: 400,
//       });
//     }

//     const newCategory = await categoryModel.create({
//       outletId,
//       categoryName: validatedData.categoryName,
//       categoryImage: validatedData.categoryImage,
//     });

//     if (!newCategory) {
//       return errMiddleware({
//         next,
//         error: "Failed to add category",
//         statusCode: 500,
//       });
//     }

//     const updatedOutlet = await outletModel.findByIdAndUpdate(outletId, {
//       $push: { categoryIdList: newCategory._id },
//     });

//     if (!updatedOutlet) {
//       Promise.all([
//         categoryModel.deleteOne({ _id: newCategory._id }),
//         outletModel.updateOne(
//           { _id: outletId },
//           { $pull: { categoryIdList: newCategory._id } }
//         ),
//       ]);

//       return errMiddleware({
//         next,
//         error: "Failed to add category",
//         statusCode: 500,
//       });
//     }

//     return okResponse({
//       response: res,
//       message: "Category added successfully",
//       data: newCategory,
//     });
//   } catch (error) {
//     return errMiddleware({ next, error, controller: "categoryAddController" });
//   }
// };

// export const categoryRemoveController = async (req, res, next) => {
//   try {
//     const outletId = req?.userData?._id;

//     if (!outletId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     const validatedData = inputValidation({
//       data: req.body,
//       next,
//       schema: Joi.object({
//         categoryId: Joi.string().required(),
//       }),
//     });

//     if (!validatedData) return;

//     // Check if the category exists
//     const category = await categoryModel.findOne({
//       _id: validatedData.categoryId,
//       outletId,
//     });
//     if (!category) {
//       return errMiddleware({
//         next,
//         error: "Category not found or does not belong to this outlet",
//         statusCode: 404,
//       });
//     }

//     // Remove the category and update the outlet
//     const [removedCategory, updatedOutlet] = await Promise.all([
//       categoryModel.deleteOne({ _id: validatedData.categoryId }),
//       outletModel.findByIdAndUpdate(outletId, {
//         $pull: { categoryIdList: validatedData.categoryId },
//       }),
//     ]);

//     if (!removedCategory || !updatedOutlet) {
//       await categoryModel.deleteOne({ _id: validatedData.categoryId });
//       return errMiddleware({
//         next,
//         error: "Failed to remove category",
//         statusCode: 500,
//       });
//     }

//     return okResponse({
//       response: res,
//       message: "Category removed successfully",
//     });
//   } catch (error) {
//     return errMiddleware({
//       next,
//       error,
//       controller: "categoryRemoveController",
//     });
//   }
// };

// export const categoryUpdateController = async (req, res, next) => {
//   try {
//     const outletId = req?.userData?._id;

//     const { categoryName, categoryId } = req.body;

//     if (!outletId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     const validatedData = inputValidation({
//       data: { categoryId, categoryName },
//       next,
//       schema: Joi.object({
//         categoryId: isId.required(),
//         categoryName: isName.required(),
//       }),
//     });

//     if (!validatedData) return;

//     const CheckValidId = isValidMongoId({ next, id: validatedData.categoryId });
//     if (!CheckValidId) return;

//     // Check if the category exists and belongs to the outlet
//     const category = await categoryModel.findOne({
//       _id: CheckValidId,
//       outletId,
//     });
//     if (!category) {
//       return errMiddleware({
//         next,
//         error: "Category not found or does not belong to this outlet",
//         statusCode: 404,
//       });
//     }

//     // Update the category
//     const updatedCategory = await categoryModel.findOneAndUpdate(
//       { _id: CheckValidId },
//       { $set: { categoryName: validatedData.categoryName } },
//       { new: true }
//     );

//     if (!updatedCategory) {
//       return errMiddleware({
//         next,
//         error: "Failed to update category",
//         statusCode: 500,
//       });
//     }

//     return okResponse({
//       response: res,
//       message: "Category updated successfully",
//       data: updatedCategory,
//     });
//   } catch (error) {
//     return errMiddleware({
//       next,
//       error,
//       controller: "categoryUpdateController",
//     });
//   }
// };

// export const categoryFoodInOutController = async (req, res, next) => {
//   try {
//     const outletId = req?.userData?._id;
//     const { categoryId, foodId, action } = req.body;

//     if (!outletId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     // Validate input
//     const validatedData = inputValidation({
//       data: { categoryId, foodId, action },
//       next,
//       schema: Joi.object({
//         categoryId: isId.required(),
//         foodId: isId.required(),
//         action: Joi.string().valid("add", "remove").required(),
//       }),
//     });

//     if (!validatedData) return;

//     const checkCategoryId = isValidMongoId({
//       next,
//       id: validatedData.categoryId,
//     });
//     const checkFoodId = isValidMongoId({ next, id: validatedData.foodId });

//     if (!checkCategoryId || !checkFoodId) return;

//     // Check if the category and food exist
//     const [category, food] = await Promise.all([
//       categoryModel.findOne({ _id: checkCategoryId, outletId }),
//       foodModel.findOne({ _id: checkFoodId, outletId }),
//     ]);

//     if (!category || !food) {
//       return errMiddleware({
//         next,
//         error: "Category or food not found or does not belong to this outlet",
//         statusCode: 404,
//       });
//     }

//     if (validatedData.action === "add") {
//       // Check if the food already exists in the list
//       const foodExists = category.foodList.some(
//         (item) => item.foodId.toString() === checkFoodId
//       );
//       if (!foodExists) {
//         await categoryModel.findByIdAndUpdate(
//           checkCategoryId,
//           {
//             $push: {
//               foodList: { foodId: checkFoodId, orderCount: 0, userList: [] },
//             },
//           },
//           { new: true }
//         );
//       }
//     } else if (validatedData.action === "remove") {
//       await categoryModel.findByIdAndUpdate(
//         checkCategoryId,
//         { $pull: { foodList: { foodId: checkFoodId } } },
//         { new: true }
//       );
//     }

//     return okResponse({
//       response: res,
//       message: `Food ${validatedData.action}ed in category successfully`,
//       data: updatedCategory,
//     });
//   } catch (error) {
//     return errMiddleware({
//       next,
//       error,
//       controller: "categoryFoodInOutController",
//     });
//   }
// };

// export const categoryListController = async (req, res, next) => {
//   try {
//     const outletId = req?.userData?._id;

//     if (!outletId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     // Fetch all categories for the given outlet
//     const categories = await categoryModel
//       .find({ outletId })
//       .select("_id categoryName categoryImage foodList");

//     if (!categories || categories.length === 0) {
//       return errMiddleware({
//         next,
//         error: "No categories found",
//         statusCode: 200,
//       });
//     }
//     const formattedCategories = categories.map((category) => ({
//       id: category._id,
//       name: category.categoryName,
//       image: category.categoryImage,
//       foods: category.foodList.map((food) => food.foodId), // Extracts only food IDs
//     }));

//     return okResponse({
//       response: res,
//       message: "Categories retrieved successfully",
//       data: formattedCategories,
//     });
//   } catch (error) {
//     return errMiddleware({
//       next,
//       error,
//       controller: "categoryListController",
//     });
//   }
// };

// export const categoryFoodListController = async (req, res, next) => {
//   try {
//     const { categoryId } = req.params;
//     console.log("categoryIdcategoryId");
//     // Validate categoryId
//     const validCategoryId = isValidMongoId({ next, id: categoryId });
//     if (!validCategoryId) return;

//     // Find the category and retrieve food details
//     const category = await categoryModel
//       .findById(validCategoryId)
//       .select("categoryName foodList")
//       .populate({
//         path: "foodList.foodId", // Populating foodId inside foodList
//         select: "foodName foodImage foodPrice foodType",
//       })
//       .lean();

//     if (!category) {
//       return errMiddleware({
//         next,
//         error: "Category not found",
//         statusCode: 404,
//       });
//     }
//     console.log(category);

//     // Format the foodList into required structure
//     const formattedFoodList = category.foodList.map((food) => ({
//       id: food.foodId._id,
//       name: food.foodId.foodName,
//       price: `$${food.foodId.foodPrice}`, // Formatting price with $
//       image: food.foodId.foodImage,
//       categoryId: category._id,
//       type: food.foodId.foodType, // Adding food type
//     }));

//     return okResponse({
//       response: res,
//       message: "Food list retrieved successfully",
//       data: formattedFoodList,
//     });
//   } catch (error) {
//     return errMiddleware({
//       next,
//       error,
//       controller: "categoryFoodListController",
//       statusCode: 500,
//     });
//   }
// };

// export const categoryStatusController = async (req, res, next) => {
//   try {
//     const outletId = req?.userData?._id;

//     if (!outletId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     // Validate input
//     const validatedData = inputValidation({
//       data: req.body,
//       next,
//       schema: Joi.object({
//         categoryId: isId.required(),
//         categoryStatus: Joi.string().valid("active", "inactive").required(),
//       }),
//     });

//     if (!validatedData) return;

//     // Validate categoryId
//     const checkCategoryId = isValidMongoId({
//       next,
//       id: validatedData.categoryId,
//     });
//     if (!checkCategoryId) return;

//     // Update category status in a **single** query
//     const updatedCategory = await categoryModel.findOneAndUpdate(
//       { _id: checkCategoryId, outletId }, // Ensures category belongs to outlet
//       { $set: { categoryStatus: validatedData.categoryStatus } },
//       { new: true }
//     );

//     if (!updatedCategory) {
//       return errMiddleware({
//         next,
//         error: "Category not found or does not belong to this outlet",
//         statusCode: 404,
//       });
//     }

//     return okResponse({
//       response: res,
//       message: "Category status updated successfully",
//       data: updatedCategory,
//     });
//   } catch (error) {
//     return errMiddleware({
//       next,
//       error,
//       controller: "categoryStatusController",
//     });
//   }
// };

// export const categoryOrderActionController = async (req, res, next) => {
//   try {
//     const outletId = req?.userData?._id;

//     if (!outletId) {
//       return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
//     }

//     // Validate input
//     const validatedData = inputValidation({
//       data: req.body,
//       next,
//       schema: Joi.object({
//         categoryId: isId.required(),
//         isOpen: Joi.string().valid("open", "close").required(),
//       }),
//     });

//     if (!validatedData) return;

//     // Validate categoryId
//     const checkCategoryId = isValidMongoId({
//       next,
//       id: validatedData.categoryId,
//     });
//     if (!checkCategoryId) return;

//     const updatedCategory = await categoryModel.findOneAndUpdate(
//       { _id: checkCategoryId, outletId }, // Ensures category belongs to outlet
//       { $set: { isOpen: validatedData.isOpen } },
//       { new: true }
//     );

//     if (!updatedCategory) {
//       return errMiddleware({
//         next,
//         error: `Category not found or does not belong to this outlet`,
//         statusCode: 404,
//       });
//     }

//     return okResponse({
//       response: res,
//       message: `Category ${
//         validatedData.isOpen === "open" ? "opened" : "closed"
//       } successfully`,
//       data: updatedCategory,
//     });
//   } catch (error) {
//     return errMiddleware({
//       next,
//       error,
//       controller: "categoryStatusController",
//     });
//   }
// };
