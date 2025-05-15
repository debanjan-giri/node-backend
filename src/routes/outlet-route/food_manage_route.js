import { Router } from "express";
import { verifyAccessToken as token } from "../../middleware/verifyAccessToken.js";
import {
  addFoodController,
  foodDetailsByIdController,
  foodListController,
  foodStatusController,
  removeFoodByIdController,
  updateFoodByIdController,
} from "../../controllers/outlet-controller/food_manage_controller.js";

const foodManageRoute = Router();

foodManageRoute.post("/add", token, addFoodController); //  { foodName, foodImage, foodPrice, foodDesription, categoryId , foodType  }
foodManageRoute.post("/remove", token, removeFoodByIdController); // /:foodId
foodManageRoute.post("/update", token, updateFoodByIdController); // { foodName, foodImage, foodPrice, foodDesription, categoryId , foodType  }
foodManageRoute.get("/list", token, foodListController);
foodManageRoute.post("/status", token, foodStatusController); //  {foodId , foodStatus}
foodManageRoute.get("/details/:foodId", token, foodDetailsByIdController); // /:foodId
export default foodManageRoute;
