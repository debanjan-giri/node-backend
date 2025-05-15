import { Router } from "express";
import {
  userLoginController,
  userRegisterController,
} from "../../controllers/user-controller/user_auth_controller.js";

const userAccountRoute = Router();

userAccountRoute.post("/register", userRegisterController);
userAccountRoute.post("/login", userLoginController);

export default userAccountRoute;
