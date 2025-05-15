import {
  isAddress,
  isDetails,
  isFoodType,
  isFoodUnit,
  isId,
  isMapPin,
  isName,
  isPassword,
  isPhone,
  isPrice,
  isUrl,
  isBoolean,
} from "./atomicSchema.js";
import Joi from "joi";

// Create cached schema objects for better performance
// This prevents recreating the schemas on every validation

// Outlet schemas
export const registerSchema = Joi.object({
  outletName: isName.required(),
  outletPhone: isPhone.required(),
  outletPassword: isPassword.required(),
}).options({ stripUnknown: true });

export const loginSchema = Joi.object({
  outletPhone: isPhone.required(),
  outletPassword: isPassword.required(),
}).options({ stripUnknown: true });

export const updateSchema = Joi.object({
  outletName: isName.optional(),
  outletPhotoUrl: isUrl.optional(),
  outletMapPoint: isMapPin.optional(),
  outletAddress: isAddress.optional(),
  outLetDetail: isDetails.optional(),
  homeDelivery: isBoolean.optional(),
}).options({ stripUnknown: true });

// Food schema - fixed categoryId validation to use isId instead of isFoodUnit
export const foodSchema = Joi.object({
  foodName: isName.required(),
  foodImage: isUrl.required(),
  foodPrice: isPrice.required(),
  categoryId: isId.required(), // Fixed: was incorrectly using isFoodUnit
  foodType: isFoodType.required(),
  foodUnit: isFoodUnit.optional(),
  foodDesription: Joi.string().trim().min(3).max(200).required(),
  outletId: isId.required(),
}).options({ stripUnknown: true });

// User schemas
export const userRegisterSchema = Joi.object({
  userName: isName.required(),
  userPhone: isPhone.required(),
  userPassword: isPassword.required(),
  userPhoto: isUrl.required(), // Changed to required to match model
  isNewOutletUser: isBoolean.required(),
}).options({ stripUnknown: true });

export const userLoginSchema = Joi.object({
  userPhone: isPhone.required(),
  userPassword: isPassword.required(),
}).options({ stripUnknown: true });

// Category schema
export const categorySchema = Joi.object({
  categoryName: isName.required(),
  categoryImage: isUrl.required(),
  outletId: isId.required(),
}).options({ stripUnknown: true });
