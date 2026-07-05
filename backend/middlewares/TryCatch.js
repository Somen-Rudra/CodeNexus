const TryCatch = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error(`[${handler.name || "handler"}]`, error);
      res.status(500).json({
        success: false,
        message: "An internal error occurred.",
      });
    }
  };
};

export default TryCatch;