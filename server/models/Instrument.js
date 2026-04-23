import mongoose from 'mongoose';

const instrumentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['FD', 'Mutual_Fund', 'ETF', 'Government', 'ELSS'] },
  category: String,
  subCategory: String,
  provider: String,
  interestRate: Number,
  interestRateSenior: Number,
  returns1yr: Number,
  returns3yr: Number,
  returns5yr: Number,
  nav: Number,
  aumCr: Number,
  expenseRatio: Number,
  riskLevel: { type: String, enum: ['Very Low', 'Low', 'Medium', 'High', 'Very High'] },
  lockInYears: { type: Number, default: 0 },
  minInvestment: Number,
  maturityYears: Number,
  exitLoad: String,
  sebiRating: String,
  taxation: String,
  sovereignGuarantee: { type: Boolean, default: false },
  tdsApplicable: { type: Boolean, default: false },
  prematureWithdrawalPenalty: String,
  trackingError: Number,
  underlyingIndex: String,
  exchange: String,
  issuer: String,
  createdAt: { type: Date, default: Date.now },
});

instrumentSchema.index({ type: 1, interestRate: -1 });
instrumentSchema.index({ name: 1 });

export default mongoose.model('Instrument', instrumentSchema);
