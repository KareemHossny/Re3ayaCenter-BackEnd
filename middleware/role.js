const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `دور ${req.user.role} غير مصرح له بالوصول إلى هذا المورد`
      });
    }
    next();
  };
};

module.exports = { authorize };