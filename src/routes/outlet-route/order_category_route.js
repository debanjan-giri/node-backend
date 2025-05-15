import { Router } from "express";
// import {
//   // categoryAddController as addController,
//   // categoryFoodInOutController as foodInOutController,
//   categoryFoodListController as foodListController,
//   categoryListController as listController,
//   categoryRemoveController as removeController,
//   categoryStatusController as statusController,
//   categoryUpdateController as updateController,
//   categoryOrderActionController as orderAction,
// } from "../../controllers/outlet-controller/order_category_controller.js";
// import { verifyAccessToken as token } from "../../middleware/verifyAccessToken.js";

const orderCategoryRoute = Router();

// orderCategoryRoute.post("/add", token, addController); // {categoryName}
// orderCategoryRoute.post("/remove", token, removeController); // /:categoryId
// orderCategoryRoute.post("/update", token, updateController); // { categoryName, categoryId }
// orderCategoryRoute.get("/list", token, listController);
// orderCategoryRoute.post("/food-inOut", token, foodInOutController); //  { categoryId, foodId, action }
// orderCategoryRoute.get("/food/:categoryId", token, foodListController); // /:categoryId
// orderCategoryRoute.post("/status", token, statusController); // { categoryId , categoryStatus }
// orderCategoryRoute.post("/accept-order/:id", token, orderAction); // { categoryId , isOpen }

export default orderCategoryRoute;
