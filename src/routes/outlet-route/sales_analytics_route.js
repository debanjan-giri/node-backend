import { Router } from "express";

import {
  getFoodOrderDetailsController as orderDetailsController,
  getCategoryOrderCountController as orderCount,
  getSalesReportController as salesReportController,
} from "../../controllers/outlet-controller/sales_report_controller.js";
import { verifyAccessToken as token } from "../../middleware/verifyAccessToken.js";

const salesAnalyticsRoute = Router();

// analytics page
salesAnalyticsRoute.post("get-report", token, salesReportController); //{ filter}

// home page
salesAnalyticsRoute.get("/order-count/:categoryId", token, orderCount);
salesAnalyticsRoute.post("/count-details", token, orderDetailsController); // { categoryId , foodId }

export default salesAnalyticsRoute;
