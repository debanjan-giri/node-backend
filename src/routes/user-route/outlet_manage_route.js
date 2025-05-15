import { Router } from "express";
import {
  connectUserToOutletController as isConnectOutlet,
  getUserConnectedOutletsController as connectionList,
  getOutletDetailsByIdController as outletDetails,
  getOutletCategoryListController as categoryList,
  getCategoryWiseFoodController as categoryWiseFood,
} from "../../controllers/user-controller/outlet_manage_controller.js";

const outletManageRoute = Router();

outletManageRoute.post("/connect-qr", isConnectOutlet);
outletManageRoute.post("/disconnect-outlet", isConnectOutlet);
outletManageRoute.get("/connection-list", connectionList); // home and outlet list
outletManageRoute.get("/outlet-details/:id", outletDetails);
outletManageRoute.get("/category-list", categoryList);
outletManageRoute.get("/category-wise-food", categoryWiseFood); // home and outlet list

export default outletManageRoute;
