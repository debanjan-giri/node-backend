import { Router } from "express";
import {
  getActiveCategoryController as activeCategory,
  foodPickedController as foodPicked,
  foodUnpickedController as foodUnpicked,
  lazyUserVisitController as lazyUserVisit,
} from "../../controllers/user-controller/plate_booking_controller";

const plate_booking_route = Router();

// home
plate_booking_route.get("/get-active-category", activeCategory);
plate_booking_route.get("/food-picked", foodPicked);
plate_booking_route.get("/food-unPicked", foodUnpicked);
plate_booking_route.get("/lazy-user-or-not", lazyUserVisit);

// previous order belong to specific outlet ,, api require
export default plate_booking_route;
