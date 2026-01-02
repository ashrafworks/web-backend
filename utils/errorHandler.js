
export function errorHandler(err, req, res, next) {
  // console.log(process.env.NODE_ENV);
  // Log error details for debugging
  console.error("Error occurred:", {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(422).json({
      success: false,
      status: 422,
      message: "Validation Error",
      type: "validation",
      errors: Object.fromEntries(
        Object.entries(err.errors).map(([field, error]) => [
          field,
          error.message,
        ])
      ),
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      status: 400,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      status: 409,
      message: `${field} already exists`,
    });
  }


  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      status: 401,
      message: "Token expired. Please login again",
    });
  }

  // Handle custom errors with statusCode
  if (err.statusCode && err.statusCode !== 500) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.statusCode,
      message: err.message || "Something went wrong",
    });
  }

  // Handle all other errors (500 Internal Server Error)
  return res.status(500).json({
    success: false,
    status: 500,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}