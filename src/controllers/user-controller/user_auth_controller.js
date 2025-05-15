import argon2 from "argon2";
import {
  userLoginSchema,
  userRegisterSchema,
} from "../../validation/input_schema.js";
import {
  createToken,
  errMiddleware,
  okResponse,
} from "../../utils/reqResFunction.js";
import { inputValidation } from "../../utils/utilityFunction.js";
import userModel from "../../models/user-model/user_model.js";

export const userRegisterController = async (req, res, next) => {
  try {
    const validatedData = inputValidation({
      data: req.body,
      next,
      schema: userRegisterSchema,
    });
    if (!validatedData) return;

    const { userName, userPhone, userPassword, userPhoto, isNewOutletUser } =
      validatedData;

    const [existingUser, hashedPassword] = await Promise.all([
      userModel.findOne({ userPhone }).lean().select("_id"),
      createHash({ next, password: userPassword }),
    ]);

    // Check if user already exists
    if (existingUser) {
      return errMiddleware({
        next,
        error: "User already exists",
        statusCode: 409,
      });
    }

    // Hash password
    if (!hashedPassword) return;

    // Create new user
    const newUser = await userModel.create({
      userName,
      userPhone,
      userPhoto,
      userPassword: hashedPassword,
      isNewOutletUser,
    });

    if (!newUser) {
      return errMiddleware({
        next,
        error: "User registration failed",
        statusCode: 500,
      });
    }

    // Generate token
    createToken(newUser._id)
      .then((accessToken) => {
        return okResponse({
          response: res,
          message: "User registered successfully",
          data: {
            userName,
            userPhone,
            userPhoto,
          },
          token: accessToken,
        });
      })
      .catch(() => {
        return errMiddleware({
          next,
          error: "Token generation failed",
          statusCode: 500,
          controller: "userRegisterController",
        });
      });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "userRegisterController",
    });
  }
};

export const userLoginController = async (req, res, next) => {
  try {
    const validatedData = inputValidation({
      data: req.body,
      next,
      schema: userLoginSchema,
    });
    if (!validatedData) return;

    const { userPhone, userPassword } = validatedData;

    // Fetch user details
    const userDetails = await userModel
      .findOne({ userPhone })
      .select("_id userName userPhone userPassword userPhoto userStatus")
      .lean();

    // Check if user exists
    if (!userDetails) {
      return errMiddleware({
        next,
        error: "Invalid credentials",
        statusCode: 401,
      });
    }

    // Verify password
    const isPasswordMatch = await argon2.verify(
      userDetails.userPassword,
      userPassword
    );
    if (!isPasswordMatch) {
      return errMiddleware({
        next,
        error: "Invalid credentials",
        statusCode: 403,
      });
    }

    // Generate access token
    createToken(userDetails._id)
      .then((accessToken) => {
        return okResponse({
          response: res,
          message: "User logged in successfully",
          data: {
            userName: userDetails.userName,
            userPhone: userDetails.userPhone,
            userPhoto: userDetails.userPhoto,
            userStatus: userDetails.userStatus,
          },
          token: accessToken,
        });
      })
      .catch(() => {
        return errMiddleware({
          next,
          error: "Token generation failed",
          statusCode: 500,
          controller: "userLoginController",
        });
      });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "userLoginController",
    });
  }
};
