import mongoose from 'mongoose';

const financialProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  income: { type: Number, required: true, min: 0 },
  age: { type: Number, required: true, min: 18, max: 80 },
  savings: { type: Number, required: true, min: 0 },
  annualIncome: { type: Number, required: true, min: 0 },
  taxSlab: { type: Number, min: 0, max: 1 },
  effectiveTaxRate: { type: Number, min: 0, max: 100 },
  taxRegime: { type: String, enum: ['new', 'old'], default: 'new' },
  riskCategory: {
    type: String,
    enum: ['Conservative', 'Conservative-Moderate', 'Moderate', 'Moderate-Aggressive', 'Aggressive'],
  },
  riskScore: { type: Number, min: 0, max: 100 },
  riskDescription: { type: String },
  recommendedEquityAllocation: { type: Number, min: 0, max: 100 },
  investableAmount: { type: Number, min: 0 },
  investmentHorizon: { type: Number, min: 1, max: 40, default: 15 },
  createdAt: { type: Date, default: Date.now },
});

financialProfileSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('FinancialProfile', financialProfileSchema);
