import { Router } from "express";
import {
  getFoodCountController as getFoodCount,
  updateFoodCountController as updateFoodCount,
} from "../../controllers/user-controller/food_point_controller.js";

const foodPointRoute = Router();

foodPointRoute.post("/update-food-count", updateFoodCount);
foodPointRoute.post("/get-food-count", getFoodCount);

export default foodPointRoute;
