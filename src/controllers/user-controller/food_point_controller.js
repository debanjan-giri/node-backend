export const updateFoodCountController = async (req, res, next) => {
  try {
    const { foodPoint } = req.body;
    const userId = req?.userData?._id;

    // Validate user authentication
    if (!userId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Find the user to check their connected outlets count
    const user = await userModel.findById(userId).lean();

    if (!user) {
      return errMiddleware({
        next,
        error: "User not found",
        statusCode: 404,
      });
    }

    const connectedOutlets = user.connectedOutlets.length;

    // Determine valid foodPoint range
    const minFoodPoint = connectedOutlets > 1 ? connectedOutlets - 1 : 0;
    const maxFoodPoint = connectedOutlets;

    // Validate input
    const validData = inputValidation({
      data: req.body,
      next,
      schema: Joi.object({
        foodPoint: Joi.number()
          .integer()
          .min(minFoodPoint)
          .max(maxFoodPoint)
          .required(),
      }),
    });

    if (!validData) return;

    // Update user's food count
    const userUpdate = await userModel.findByIdAndUpdate(
      userId,
      { $inc: { foodSavedCount: foodPoint } },
      { new: true }
    );

    return okResponse({
      response: res,
      message: "Food count updated successfully",
      data: { updatedFoodCount: userUpdate.foodSavedCount },
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "updateFoodCountController",
    });
  }
};


export const getFoodCountController = async (req, res, next) => {
  try {
    const userId = req?.userData?._id;

    // Validate user authentication
    if (!userId) {
      return errMiddleware({ next, error: "Unauthorized", statusCode: 401 });
    }

    // Find user and get their foodSavedCount
    const user = await userModel
      .findById(userId)
      .select("foodSavedCount")
      .lean();

    if (!user) {
      return errMiddleware({
        next,
        error: "User not found",
        statusCode: 404,
      });
    }

    return okResponse({
      response: res,
      message: "Food count retrieved successfully",
      data: { foodSavedCount: user.foodSavedCount },
    });
  } catch (error) {
    return errMiddleware({
      next,
      error,
      controller: "getFoodCountController",
    });
  }
};
