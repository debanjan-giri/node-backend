import Joi from "joi";
import mongoose from "mongoose";

// Configure Joi to use minimal error messages globally
Joi.defaults((schema) => {
  return schema.error((errors) => {
    return errors.map((err) => {
      // Simplify error messages to reduce memory usage
      switch (err.code) {
        case "string.base":
          return { ...err, message: "Must be a string" };
        case "string.min":
          return { ...err, message: "Too short" };
        case "string.max":
          return { ...err, message: "Too long" };
        case "string.email":
          return { ...err, message: "Invalid email" };
        case "string.uri":
          return { ...err, message: "Invalid URL" };
        case "string.pattern.base":
          return { ...err, message: "Invalid format" };
        case "number.base":
          return { ...err, message: "Must be a number" };
        case "number.min":
          return { ...err, message: "Too small" };
        case "number.max":
          return { ...err, message: "Too large" };
        case "array.base":
          return { ...err, message: "Must be an array" };
        case "boolean.base":
          return { ...err, message: "Must be true or false" };
        case "any.required":
          return { ...err, message: "Required field" };
        default:
          return err;
      }
    });
  });
}); 

// Optimized schemas with minimal error messages and proper validations
export const isName = Joi.string().trim().min(3).max(20);

// Validate phone number with regex pattern for digits only
export const isPhone = Joi.string()
  .pattern(/^\d{10}$/)
  .message("Phone must be exactly 10 digits");

// Fix min value to match error message (6 characters)
export const isPassword = Joi.string().trim().min(6).max(10);

export const isAddress = Joi.string().trim().min(6).max(50);

// Optimize URL validation
export const isUrl = Joi.string().uri();

export const isMapPin = Joi.string().trim();

export const isDetails = Joi.string().trim().min(6).max(100);

// Optimize email validation
export const isEmail = Joi.string().email();

export const isPrice = Joi.number().min(0).precision(2);

export const isCategory = Joi.string().trim();

// Validate MongoDB ObjectId format
export const isId = Joi.string()
  .custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error("string.objectId");
    }
    return value;
  }, "MongoDB ObjectId validation")
  .message("Invalid ID format");

export const isFoodUnit = Joi.string().trim();

// Optimize array validation
export const isArray = Joi.array();

// Optimize boolean validation
export const isBoolean = Joi.boolean();

// Add enum validation for food type
export const isFoodType = Joi.string().valid("veg", "non-veg", "both");
