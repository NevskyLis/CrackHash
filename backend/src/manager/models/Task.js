const mongoose = require('mongoose');
const { TaskStatus, WorkerStatus } = require('../../common/status');

const taskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  maxLength: { type: Number, required: true },
  status: { 
    type: String, 
    enum: Object.values(TaskStatus),
    default: TaskStatus.IN_QUEUE 
  },
  workerStatuses: {
    type: [String],
    enum: Object.values(WorkerStatus),
    default: []
  },
  workerResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
  workerProgress: { type: [Number], default: [] },
  result: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  progress: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
});

module.exports = mongoose.model('Task', taskSchema);
