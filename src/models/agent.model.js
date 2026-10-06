const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Agent email is required'],
      trim: true,
      lowercase: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
    },
    availability: {
      type: String,
      enum: ['online', 'offline', 'busy'],
      default: 'online',
    },
  },
  {
    timestamps: true,
  }
);

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;
