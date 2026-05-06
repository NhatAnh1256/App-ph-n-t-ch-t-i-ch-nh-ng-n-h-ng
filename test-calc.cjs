const fs = require('fs');
const XLSX = require('xlsx');

const file = './public/Du_lieu_app_Ngan_hang_25_Clean_2904.xlsx';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['BCTC'];
const data = XLSX.utils.sheet_to_json(sheet, { defval: 0 });

const BASE_STOCK_PRICE = {
  VCB: 90000, BID: 50000, CTG: 35000, TCB: 45000, MBB: 24000, ACB: 28000,
  VPB: 20000, HDB: 22000, VIB: 21000, STB: 30000, TPB: 18000, SHB: 12000,
  MSB: 15000, OCB: 14000, SSB: 22000, EIB: 18000, LPB: 16000, NAB: 15000,
  BAB: 14000, BVB: 12000, VAB: 10000, KLB: 12000, NVB: 10000, SGB: 13000,
  VBB: 11000, ABB: 8000,
};

if(data.length > 0) {
  for (let i = 0; i < 5; i++) {
    const row = data[i];
    const ticker = row['Mã CK'];
    const year = Number(row['Năm']);
    const quarterNum = Number(row['Quý']);
    const pat = Number(row['XIV. Lợi nhuận sau thuế (đồng) (Q)'] || 0);
    const totalEquity = Number(row['C. Vốn chủ sở hữu (đồng) (Q)'] || 0);
    const charterCapital = Number(row['1. Vốn điều lệ (đồng) (Q)'] || 0);
    
    let actPriceRaw = 0;
    const basePrice = BASE_STOCK_PRICE[ticker] || 15000;
    let cycleMultiplier = 1.0;
    if (year <= 2020) cycleMultiplier = 0.8 + quarterNum * 0.05;
    
    const noise = 0.9 + ((ticker.charCodeAt(0) * quarterNum) % 20) / 100;
    actPriceRaw = basePrice * cycleMultiplier * noise;
    
    const numberOfShares = charterCapital / 10000;
    let actMarketCap = actPriceRaw * numberOfShares;
    
    let PB = actMarketCap / totalEquity;
    let PE = actMarketCap / (pat * 4);
    
    console.log({
       ticker, year, quarterNum, charterCapital, totalEquity, pat,
       actPriceRaw, numberOfShares, actMarketCap, PB, PE
    });
  }
}
