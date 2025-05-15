import outletModel from "../../models/outlet-model/outlet_model.js";
import {
  createHash,
  isValidMongoId,
  removeEmptyFields,
} from "../../utils/utilityFunction.js";
import {
  createToken,
  errMiddleware,
  okResponse,
} from "../../utils/reqResFunction.js";
import { isPassword, isPhone, isId } from "../../validation/atomicSchema.js";
import Joi from "joi";
import argon2 from "argon2";

export const outletRegisterController = async (req, res, next) => {
  try {
    // Simple validation
    const { outletName, outletPhone, outletPassword } = req.body;

    if (!outletName || !outletPhone || !outletPassword) {
      return errMiddleware({
        next,
        error: "Name, phone, and password are required",
        statusCode: 400,
      });
    }

    // Check if phone is valid (10 digits)
    if (!/^\d{10}$/.test(outletPhone)) {
      return errMiddleware({
        next,
        error: "Phone must be 10 digits",
        statusCode: 400,
      });
    }

    // Check if outlet already exists
    const existingOutlet = await outletModel
      .findOne({ outletPhone })
      .select("_id")
      .lean();

    if (existingOutlet) {
      return errMiddleware({
        next,
        error: "Outlet already exists",
        statusCode: 409,
      });
    }

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await createHash(outletPassword);
    } catch (error) {
      return errMiddleware({
        next,
        error: "Password hashing failed",
        statusCode: 500,
      });
    }

    // Create new outlet with minimal fields
    const newOutlet = await outletModel.create({
      outletName,
      outletPhone,
      outletPassword: hashedPassword,
    });

    // Generate token
    createToken(newOutlet._id)
      .then((accessToken) => {
        return okResponse({
          response: res,
          message: "Outlet registered successfully",
          data: {
            outletId: newOutlet._id,
            outletName: newOutlet.outletName,
            outletPhone: newOutlet.outletPhone,
          },
          token: accessToken,
        });
      })
      .catch(() => {
        return errMiddleware({
          next,
          error: "Token generation failed",
          statusCode: 500,
          controller: "registerOutletController",
        });
      });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "registerOutletController",
    });
  }
};

export const outletLoginController = async (req, res, next) => {
  try {
    // Simple validation
    const { outletPhone, outletPassword } = req.body;

    if (!outletPhone || !outletPassword) {
      return errMiddleware({
        next,
        error: "Phone and password are required",
        statusCode: 400,
      });
    }

    // Fetch outlet with minimal fields
    const outletDetails = await outletModel
      .findOne({ outletPhone })
      .select("_id outletName outletPhone outletPassword")
      .lean();

    // Check if outlet exists
    if (!outletDetails) {
      return errMiddleware({
        next,
        error: "Invalid credentials",
        statusCode: 401,
      });
    }

    // Verify password
    const isPasswordMatch = await argon2.verify(
      outletDetails.outletPassword,
      outletPassword
    );

    if (!isPasswordMatch) {
      return errMiddleware({
        next,
        error: "Invalid credentials",
        statusCode: 403,
      });
    }

    // Generate access token
    createToken(outletDetails._id)
      .then((accessToken) => {
        return okResponse({
          response: res,
          message: "Outlet logged in successfully",
          data: {
            outletId: outletDetails._id,
            outletName: outletDetails.outletName,
            outletPhone: outletDetails.outletPhone,
          },
          token: accessToken,
        });
      })
      .catch(() => {
        return errMiddleware({
          next,
          error: "Token generation failed",
          statusCode: 500,
          controller: "outletLoginController",
        });
      });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "outletLoginController",
    });
  }
};

export const outletDeleteController = async (req, res, next) => {
  try {
    const tokenId = req?.userData?._id;
    const password = req?.userData?.outletPassword;

    if (!tokenId) {
      return errMiddleware({
        next,
        error: "Unauthorized",
        statusCode: 401,
      });
    }

    const validatedData = inputValidation({
      data: req.body,
      next,
      schema: Joi.object({
        outletPassword: isPassword.required(),
      }),
    });

    if (!validatedData) return;

    const { outletPassword } = validatedData;

    const isPasswordMatch = await argon2.verify(password, outletPassword);
    if (!isPasswordMatch) {
      return errMiddleware({
        next,
        error: "Invalid credentials",
        statusCode: 403,
      });
    }

    await outletModel.findByIdAndDelete(tokenId).lean().exec();

    return okResponse({
      response: res,
      message: "Outlet account deleted successfully",
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "outletDeleteAccountController",
    });
  }
};

export const outletDetailsController = async (req, res, next) => {
  try {
    const tokenId = req?.userData?._id;

    if (!tokenId) {
      return errMiddleware({
        next,
        error: "Unauthorized",
        statusCode: 401,
      });
    }

    const outletDetails = req?.userData;
    delete outletDetails?.outletPassword;

    return okResponse({
      response: res,
      message: "Outlet details fetched successfully",
      data: outletDetails,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "outletDetailsController",
    });
  }
};

export const outletDetailsByIdController = async (req, res, next) => {
  try {
    const validatedData = inputValidation({
      data: req?.param?.outletId,
      next,
      schema: Joi.object({
        outletId: isId.required(),
      }),
    });

    if (!validatedData) return;

    const { outletId } = validatedData;

    const validId = isValidMongoId({ next, id: outletId });
    if (!validId) return;

    const outletDetails = await outletModel
      .findById({ _id: validId })
      .select("-outletPassword")
      .lean();

    // Check if outlet exists
    if (!outletDetails) {
      return errMiddleware({
        next,
        error: "Outlet not found",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Outlet details fetched successfully",
      data: outletDetails,
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "outletDetailsController",
    });
  }
};

export const outletUpdateController = async (req, res, next) => {
  try {
    const tokenId = req?.userData?._id;

    if (!tokenId) {
      return errMiddleware({
        next,
        error: "Unauthorized",
        statusCode: 401,
      });
    }

    const validatedData = inputValidation({
      data: req.body,
      next,
      schema: updateSchema,
    });

    if (!validatedData) return;

    const emptyRemoved = removeEmptyFields(next, validatedData);

    await outletModel
      .findByIdAndUpdate(
        { _id: tokenId },
        { $set: emptyRemoved },
        { new: true, runValidators: true }
      )
      .lean();

    return okResponse({
      response: res,
      message: "Outlet details updated successfully",
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "outletUpdateController",
    });
  }
};

export const forgotPasswordController = async (req, res, next) => {
  try {
    const { phone, secretKey, newPassword } = req.body;

    // Validate input
    const validatedData = inputValidation({
      data: { phone, secretKey, newPassword },
      next,
      schema: Joi.object({
        phone: isPhone.required(),
        secretKey: isId.required(),
        newPassword: isPassword.required(),
      }),
    });

    if (!validatedData) return;

    const {
      phone: outletPhone,
      secretKey: inputSecretKey,
      newPassword: outletPassword,
    } = validatedData;

    // Find outlet by phone
    const outlet = await outletModel.findOne({ outletPhone });

    if (!outlet) {
      return errMiddleware({
        next,
        error: "Outlet not found",
        statusCode: 404,
      });
    }

    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
    if (inputSecretKey !== ADMIN_SECRET_KEY) {
      return errMiddleware({
        next,
        error: "Invalid secret key",
        statusCode: 401,
      });
    }

    // Hash new password
    const hashedPassword = createHash({ next, password: outletPassword });

    // Update outlet password
    outlet.outletPassword = hashedPassword;
    await outlet.save();

    return okResponse({
      response: res,
      message:
        "Password reset successful. You can now log in with the new password.",
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "forgotPasswordController",
    });
  }
};
