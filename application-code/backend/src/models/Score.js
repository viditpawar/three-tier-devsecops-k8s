const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    playerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 20,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100000,
    },
  },
  { timestamps: true }
);

scoreSchema.index({ score: -1 });

module.exports = mongoose.model('Score', scoreSchema);
