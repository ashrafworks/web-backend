export function errorHandler(err, req, res, next) {
  console.error({err} || "internal server error aya hai");
  if(!err.statusCode || err.statusCode === 500) {
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
