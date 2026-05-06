export type BankGroup = 'Nhóm quốc doanh' | 'Nhóm chuyên cho vay DN' | 'Nhóm chuyên cho vay cá nhân' | 'Nhóm khác';

export const BANK_GROUPS: Record<string, BankGroup> = {
  CTG: 'Nhóm quốc doanh',
  VCB: 'Nhóm quốc doanh',
  BID: 'Nhóm quốc doanh',
  LPB: 'Nhóm chuyên cho vay DN',
  TCB: 'Nhóm chuyên cho vay DN',
  MBB: 'Nhóm chuyên cho vay DN',
  HDB: 'Nhóm chuyên cho vay DN',
  MSB: 'Nhóm chuyên cho vay DN',
  SHB: 'Nhóm chuyên cho vay DN',
  OCB: 'Nhóm chuyên cho vay DN',
  SSB: 'Nhóm chuyên cho vay DN',
  ACB: 'Nhóm chuyên cho vay cá nhân',
  VIB: 'Nhóm chuyên cho vay cá nhân',
  STB: 'Nhóm chuyên cho vay cá nhân',
  TPB: 'Nhóm chuyên cho vay cá nhân',
  VPB: 'Nhóm chuyên cho vay cá nhân',
  NAB: 'Nhóm khác',
  VAB: 'Nhóm khác',
  BVB: 'Nhóm khác',
  VBB: 'Nhóm khác',
  EIB: 'Nhóm khác',
  SGB: 'Nhóm khác',
  KLB: 'Nhóm khác',
  BAB: 'Nhóm khác',
  ABB: 'Nhóm khác',
  NVB: 'Nhóm khác',
  PGB: 'Nhóm khác',
};

export interface RawDataRow {
  'Mã CK': string;
  'Năm': number;
  'Quý': number;
  
  // Assets
  'A. TỔNG TÀI SẢN (đồng) (Q)'?: number;
  'I. Tiền mặt, vàng bạc, đá quý (đồng) (Q)'?: number;
  'II. Tiền gửi tại Ngân hàng nhà nước (đồng) (Q)'?: number;
  'III. Tiền gửi và cho vay các TCTD khác (đồng) (Q)'?: number;
  'IV. Chứng khoán kinh doanh ròng (đồng) (Q)'?: number;
  'VI. Cho vay khách hàng ròng (đồng) (Q)'?: number;
  'VII. Chứng khoán đầu tư (đồng) (Q)'?: number;
  'VIII. Góp vốn, đầu tư dài hạn (đồng) (Q)'?: number;
  'IX. Tài sản cố định (đồng) (Q)'?: number;
  'X. Bất động sản đầu tư (đồng) (Q)'?: number;
  'XI. Tài sản Có khác (đồng) (Q)'?: number;

  // Liabilities
  'B. TỔNG NỢ PHẢI TRẢ (đồng) (Q)'?: number;
  'I. Các khoản nợ Chính phủ và NHNN (đồng) (Q)'?: number;
  'II. Tiền gửi và vay các TCTD khác (đồng) (Q)'?: number;
  'III. Tiền gửi của khách hàng (đồng) (Q)'?: number;
  'VI. Phát hành giấy tờ có giá (đồng) (Q)'?: number;
  'VII. Các khoản nợ khác (đồng) (Q)'?: number;

  // Equity
  'C. Vốn chủ sở hữu (đồng) (Q)'?: number;
  '1. Vốn điều lệ (đồng) (Q)'?: number;
  '3. Thặng dư vốn cổ phần (đồng) (Q)'?: number;
  'V. Lợi nhuận chưa phân phối lũy kế (đồng) (Q)'?: number;
  'I. Vốn của tổ chức tín dụng (đồng) (Q)'?: number;

  // Income Statement
  'I. Thu nhập lãi thuần (đồng) (Q)'?: number;
  'II. Lãi thuần từ hoạt động dịch vụ (đồng) (Q)'?: number;
  'III. Lãi/(lỗ) thuần từ ngoại hối và vàng (đồng) (Q)'?: number;
  'IV. Lãi/(lỗ) thuần từ mua bán CKKD (đồng) (Q)'?: number;
  'V. Lãi/(lỗ) thuần từ mua bán CKĐT (đồng) (Q)'?: number;
  'VI. Lãi/(lỗ) thuần từ hoạt động khác (đồng) (Q)'?: number;
  'VII. Thu nhập từ góp vốn, mua cổ phần (đồng) (Q)'?: number;
  'VIII. Tổng thu nhập hoạt động (đồng) (Q)'?: number;
  'IX. Chi phí hoạt động (đồng) (Q)'?: number;
  'X. Lợi nhuận thuần HDKD trước DPRRTD (đồng) (Q)'?: number;
  'XI. Chi phí dự phòng rủi ro tín dụng (đồng) (Q)'?: number;
  'XII. Tổng lợi nhuận trước thuế (đồng) (Q)'?: number;
  'XIV. Lợi nhuận sau thuế (đồng) (Q)'?: number;
  '1. Thu nhập lãi và các khoản thu nhập tương tự (đồng) (Q)'?: number;
  '2. Chi phí lãi và các chi phí tương tự (đồng) (Q)'?: number;

  // Loan Quality
  'III. Dư nợ theo chất lượng nợ cho vay (đồng) (Q)'?: number;
  '1. Nợ đủ tiêu chuẩn (đồng) (Q)'?: number;
  '2. Nợ cần chú ý (đồng) (Q)'?: number;
  '3. Nợ dưới tiêu chuẩn (đồng) (Q)'?: number;
  '4. Nợ nghi ngờ (đồng) (Q)'?: number;
  '5. Nợ xấu có khả năng mất vốn (đồng) (Q)'?: number;
  'VII. Dự phòng rủi ro cho vay khách hàng (đồng) (Q)'?: number;
  '1. Dự phòng chung (đồng) (Q)'?: number;
  '2. Dự phòng cụ thể (đồng) (Q)'?: number;
  '1. Cho vay khách hàng (đồng) (Q)'?: number;

  // Deposits
  'X. Tiền gửi theo loại hình (đồng) (Q)'?: number;
  '1. Tiền gửi không kỳ hạn (đồng) (Q)'?: number;

  // Misc
  '2. Các khoản lãi, phí phải thu (đồng) (Q)'?: number;
  
  [key: string]: any;
}

export interface ProcessedData {
  quarter: string;
  year: number;
  quarterNum: number;
  quarterLabel: string; // Q1/23
  ticker: string;
  group: BankGroup;

  // Extracted values (0 if undefined)
  TotalAssets: number;
  CashGold: number;
  DepositsSBV: number;
  InterbankAsset: number;
  TradingSecurities: number;
  NetCustomerLoans: number;
  InvestmentSecurities: number;
  LongTermInvestments: number;
  FixedAssets: number;
  InvestmentRealEstate: number;
  OtherAssets: number;

  TotalLiabilities: number;
  GovSBVBorrowings: number;
  InterbankDepositsLiab: number;
  CustomerDeposits: number;
  IssuedValuablePapers: number;
  OtherLiabilities: number;

  TotalEquity: number;
  CharterCapital: number;
  SharePremium: number;
  RetainedEarnings: number;
  InstCapital: number; // OtherEquity

  NetInterestIncome: number;
  NetFeeServiceIncome: number;
  FXGoldIncome: number;
  TradingSecuritiesIncome: number;
  InvestmentSecuritiesIncome: number;
  OtherOpIncome: number;
  EquityInvestmentIncome: number;
  TotalOpIncome: number;
  OperatingExpenses: number;
  PreProvOpProfit: number;
  CreditLossProvision: number;
  PBT: number;
  PAT: number;
  InterestIncome: number;
  InterestExpense: number;

  TotalClassifiedLoans: number;
  Group1Loans: number;
  Group2Loans: number;
  Group3Loans: number;
  Group4Loans: number;
  Group5Loans: number;
  LLR: number;
  TotalCustomerLoansGross: number;

  DemandDeposits: number;
  AccruedInterestReceivable: number;

  PE: number;
  PB: number;
}

export interface AggregatedQuarterData {
  quarterLabel: string;
  year: number;
  quarterNum: number;
  
  // Sums
  TotalAssets: number;
  CashGold: number;
  DepositsSBV: number;
  InterbankAsset: number;
  TradingSecurities: number;
  NetCustomerLoans: number;
  InvestmentSecurities: number;
  LongTermInvestments: number;
  FixedAssets: number;
  InvestmentRealEstate: number;
  OtherAssets: number;
  TotalLiabilities: number;
  GovSBVBorrowings: number;
  InterbankDepositsLiab: number;
  CustomerDeposits: number;
  IssuedValuablePapers: number;
  OtherLiabilities: number;
  TotalEquity: number;
  CharterCapital: number;
  SharePremium: number;
  RetainedEarnings: number;
  InstCapital: number;
  NetInterestIncome: number;
  NetFeeServiceIncome: number;
  FXGoldIncome: number;
  TradingSecuritiesIncome: number;
  InvestmentSecuritiesIncome: number;
  OtherOpIncome: number;
  EquityInvestmentIncome: number;
  TotalOpIncome: number;
  OperatingExpenses: number;
  PreProvOpProfit: number;
  CreditLossProvision: number;
  PBT: number;
  PAT: number;
  InterestIncome: number;
  InterestExpense: number;
  Group1Loans: number;
  Group2Loans: number;
  Group3Loans: number;
  Group4Loans: number;
  Group5Loans: number;
  LLR: number;
  TotalCustomerLoansGross: number;
  DemandDeposits: number;
  AccruedInterestReceivable: number;
  
  // Ratios
  nplRatio: number;
  overdueRatio: number;
  llrRatio: number;
  creditProvRatio: number;
  nim: number;
  cof: number;
  yea: number;
  cir: number;
  roa: number;
  roe: number;
  ldr: number;
  casa: number;
  highLiqRatio: number;
  aeRatio: number;
  feeIncRatio: number;
  accruedIntDays: number;
  opOpexAssets: number;
  intExpDeposits: number;
  PE: number;
  PB: number;

  // YoY
  patGrowthYoY: number | null;
  loanGrowthYoY: number | null;
}
