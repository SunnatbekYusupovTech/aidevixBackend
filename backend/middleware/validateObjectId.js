const mongoose = require('mongoose');

module.exports = function (paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    next();
  };
};
