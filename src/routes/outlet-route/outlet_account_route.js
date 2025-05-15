import { Router } from "express";
import { verifyAccessToken as token } from "../../middleware/verifyAccessToken.js";
import {
  outletDetailsController as details,
  outletDetailsByIdController as detailsById,
  outletRegisterController as register,
  outletLoginController as login,
  outletUpdateController as update,
  outletDeleteController as deleteOutlet,
  forgotPasswordController as forgotPassword,
} from "../../controllers/outlet-controller/outlet_account_controller.js";

const outletAuthRoute = Router();

// auth
outletAuthRoute.post("/register", register); // { outletName, outletPhone, outletPassword }
outletAuthRoute.post("/login", login); // { outletPhone, outletPassword }
outletAuthRoute.post("/forgot-password", forgotPassword); // { phone, secretKey, newPassword }

// outlet
outletAuthRoute.get("/details", token, details);
outletAuthRoute.get("/details/:outletId", token, detailsById); // /:outletId
outletAuthRoute.post("/update-details", token, update); // { outletName , outletPhotoUrl, outletMapPoint, outletAddress, outLetDetail }
outletAuthRoute.post("/delete-outlet-account", token, deleteOutlet); // {outletPassword}
export default outletAuthRoute;
