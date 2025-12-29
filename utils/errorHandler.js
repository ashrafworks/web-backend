export function errorHandler(err, req, res, next) {
  console.log(err.errors);
  console.log(err.message);
  console.log(err.statusCode);
  console.error({ err } || "internal server error aya hai");
  if (!err.statusCode || err.statusCode === 500) {
    if (err.name === "ValidationError") {
      return res.status(422).json({
        type: "validation",
        errors: Object.fromEntries(
          Object.entries(err.errors).map(([k, v]) => [k, v.message])
        ),
      });
    }
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error",
    });
  }

  res.status(err.statusCode).json({
    success: false,
    status: err.statusCode,
    message: err.message,
  });
}
