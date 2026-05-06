import React, { useState, useMemo, useEffect } from 'react';
import { AggregatedQuarterData, ProcessedData, BankGroup, BANK_GROUPS } from '../types';
import { aggregateData } from '../utils/dataProcessor';
import { MixedChart } from './Charts';
import { ChevronDown } from 'lucide-react';

interface DashboardProps {
  rawData: ProcessedData[];
}

const COLORS = ['#00B4D8', '#023E8A', '#52B788', '#E63946', '#F4A261', '#90E0EF', '#7B2D8B', '#FFB703', '#FB8500', '#A2D2FF'];

export function Dashboard({ rawData }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'industry' | 'group' | 'bank' | 'compare' | 'valuation'>('industry');
  const [selectedGroupTab2, setSelectedGroupTab2] = useState<BankGroup | 'Tất cả'>('Tất cả');
  
  // Banks
  const allBanks = useMemo(() => Array.from(new Set(rawData.map((d) => d.ticker))).sort(), [rawData]);
  const [selectedBank, setSelectedBank] = useState<string>(allBanks[0] || '');

  // Compare Tab State
  const [compareBankGroup, setCompareBankGroup] = useState<BankGroup | 'Tất cả'>('Nhóm quốc doanh');
  const banksInCompareGroup = useMemo(() => {
    if (compareBankGroup === 'Tất cả') return allBanks;
    return Array.from(new Set(rawData.filter(d => d.group === compareBankGroup).map(d => d.ticker))).sort();
  }, [rawData, compareBankGroup, allBanks]);
  // By default, select all banks in the group
  const [compareBanks, setCompareBanks] = useState<Set<string>>(new Set(banksInCompareGroup));
  const [showCompareBankDropdown, setShowCompareBankDropdown] = useState(false);

  // Valuation Tab State
  const [valuationMetric, setValuationMetric] = useState<'PB' | 'PE'>('PB');
  const [valuationMetric2, setValuationMetric2] = useState<'PB' | 'PE'>('PB');
  const [valuationBanks, setValuationBanks] = useState<Set<string>>(new Set(allBanks));
  const [showValuationBankDropdown, setShowValuationBankDropdown] = useState(false);
  const [showQuarterDropdown51, setShowQuarterDropdown51] = useState(false);
  const [showQuarterDropdown52, setShowQuarterDropdown52] = useState(false);

  // Update compare banks when group changes
  useEffect(() => {
    setCompareBanks(new Set(banksInCompareGroup));
  }, [banksInCompareGroup]);

  // Quarters
  const allQuarters = useMemo(() => Array.from(new Set(rawData.map((d) => d.quarterLabel))), [rawData]);
  const [selectedQuarters, setSelectedQuarters] = useState<Set<string>>(new Set(allQuarters));
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);

  // Filter data by selected quarters
  const filteredRawData = useMemo(() => {
    return rawData.filter((d) => selectedQuarters.has(d.quarterLabel));
  }, [rawData, selectedQuarters]);

  // Industry aggregation
  const industryData = useMemo(() => aggregateData(filteredRawData), [filteredRawData]);

  // Group aggregation
  const groupRawData = useMemo(() => {
    if (selectedGroupTab2 === 'Tất cả') return filteredRawData;
    return filteredRawData.filter((d) => d.group === selectedGroupTab2);
  }, [filteredRawData, selectedGroupTab2]);
  const groupAggregatedData = useMemo(() => aggregateData(groupRawData), [groupRawData]);

  // Latest quarter individual banks for Tab 2
  const latestQuarterLabel = useMemo(() => {
    if (groupAggregatedData.length === 0) return '';
    return groupAggregatedData[groupAggregatedData.length - 1].quarterLabel;
  }, [groupAggregatedData]);

  const latestQuarterIndividualData = useMemo(() => {
    if (!latestQuarterLabel) return [];
    return groupRawData.filter((d) => d.quarterLabel === latestQuarterLabel);
  }, [groupRawData, latestQuarterLabel]);

  const latestQuarterAggregatedAllGroups = useMemo(() => {
    if (activeTab !== 'group') return null;
    const byGroup = {} as Record<string, AggregatedQuarterData>;
    ['Nhóm quốc doanh', 'Nhóm chuyên cho vay DN', 'Nhóm chuyên cho vay cá nhân', 'Nhóm khác'].forEach((g) => {
      const gData = aggregateData(filteredRawData.filter((d) => d.group === g));
      if (gData.length > 0) {
        byGroup[g] = gData[gData.length - 1];
      }
    });
    const allGData = aggregateData(filteredRawData);
    if (allGData.length > 0) {
      byGroup['All'] = allGData[allGData.length - 1];
    }
    return byGroup;
  }, [activeTab, filteredRawData]);

  const pivotsForBankTab = useMemo(() => {
    if (activeTab !== 'bank') return [];
    
    // Group data for the selected bank's group
    const bGroup = filteredRawData.find(d => d.ticker === selectedBank)?.group || 'Nhóm khác';
    const bGroupData = aggregateData(filteredRawData.filter(d => d.group === bGroup));
    
    // Bank specific data (aggregated to compute ratios)
    const bData = aggregateData(filteredRawData.filter(d => d.ticker === selectedBank));

    return bData.map(bRow => {
       const q = bRow.quarterLabel;
       const iRow = industryData.find(i => i.quarterLabel === q);
       const gRow = bGroupData.find(g => g.quarterLabel === q);
       
       const row: any = { ...bRow }; // contains bank's aggregated fields and ratios
       
       // Add industry ratios
       if (iRow) {
         Object.keys(iRow).forEach(key => {
           if (key !== 'quarterLabel') row[`industry_${key}`] = (iRow as any)[key];
         });
       }
       // Add group ratios
       if (gRow) {
         Object.keys(gRow).forEach(key => {
           if (key !== 'quarterLabel') row[`group_${key}`] = (gRow as any)[key];
         });
       }
       
       return row;
    });
  }, [activeTab, filteredRawData, selectedBank, industryData]);
    
  const pivotsForCompareTab = useMemo(() => {
    if (activeTab !== 'compare') return [];
    
    // We need to group filteredRawData by quarterLabel. 
    // And inside each quarter, we need the metrics for each selected bank in compareBanks.
    // Instead of using aggregateData (which sums all banks), we want to get the metrics for EACH bank individually.
    // However, the raw data only has raw fields. We need to run aggregateData for EACH bank individually first.
    
    const selectedBanksArray = Array.from(compareBanks) as string[];
    const bankTimeseriesData: Record<string, any[]> = {};
    
    selectedBanksArray.forEach(b => {
      // get the aggregated metrics for this specific bank over time
      const bData = aggregateData(filteredRawData.filter(d => d.ticker === b));
      bankTimeseriesData[b] = bData;
    });

    const sortedQuarters = Array.from(new Set(filteredRawData.map(d => d.quarterLabel as string))).sort((a,b) => {
      const aStr = String(a);
      const bStr = String(b);
      const numA = parseInt(aStr.slice(1,2));
      const yearA = parseInt(aStr.slice(3,5));
      const numB = parseInt(bStr.slice(1,2));
      const yearB = parseInt(bStr.slice(3,5));
      if (yearA !== yearB) return yearA - yearB;
      return numA - numB;
    });

    return sortedQuarters.map(q => {
      const row: any = { quarterLabel: q };
      selectedBanksArray.forEach(b => {
         const qData = bankTimeseriesData[b].find(d => d.quarterLabel === q);
         if (qData) {
            Object.keys(qData).forEach(key => {
               if (key !== 'quarterLabel') {
                  // create a unique property like patGrowthYoY_BID
                  row[`${key}_${b}`] = qData[key];
               }
            });
         }
      });
      return row;
    });
  }, [activeTab, filteredRawData, compareBanks]);

  const bankPivotsForValuation = useMemo(() => {
    if (activeTab !== 'valuation') return [];
    
    // Create an object holding the timeseries for each bank (no filter by selected banks)
    const bankTimeseriesData: Record<string, any[]> = {};
    allBanks.forEach(b => {
      bankTimeseriesData[b] = aggregateData(filteredRawData.filter(d => d.ticker === b));
    });

    const sortedQuarters = Array.from(new Set(filteredRawData.map(d => d.quarterLabel as string))).sort((a,b) => {
      const aStr = String(a);
      const bStr = String(b);
      const numA = parseInt(aStr.slice(1,2));
      const yearA = parseInt(aStr.slice(3,5));
      const numB = parseInt(bStr.slice(1,2));
      const yearB = parseInt(bStr.slice(3,5));
      if (yearA !== yearB) return yearA - yearB;
      return numA - numB;
    });

    return sortedQuarters.map(q => {
      const row: any = { quarterLabel: q };
      allBanks.forEach(b => {
         const qData = bankTimeseriesData[b].find(d => d.quarterLabel === q);
         if (qData) {
            row[`PE_${b}`] = qData.PE || 0;
            row[`PB_${b}`] = qData.PB || 0;
         }
      });
      return row;
    });
  }, [activeTab, filteredRawData, allBanks]);
  
  const pivotedGroupData = useMemo(() => {
    const groups = ['Nhóm quốc doanh', 'Nhóm chuyên cho vay DN', 'Nhóm chuyên cho vay cá nhân', 'Nhóm khác'];
    const names = ['Quốc doanh', 'Bán buôn', 'Bán lẻ', 'Khác'];
    
    // Evaluate aggregateData once per full timeseries for each group
    const groupTimeseries = groups.map(g => {
       const gData = filteredRawData.filter(d => d.group === g);
       return aggregateData(gData);
    });

    const sortedQuarters = Array.from(new Set(filteredRawData.map(d => d.quarterLabel as string))).sort((a,b) => {
      const aStr = String(a);
      const bStr = String(b);
      const numA = parseInt(aStr.slice(1,2));
      const yearA = parseInt(aStr.slice(3,5));
      const numB = parseInt(bStr.slice(1,2));
      const yearB = parseInt(bStr.slice(3,5));
      if (yearA !== yearB) return yearA - yearB;
      return numA - numB;
    });

    return sortedQuarters.map(q => {
      const row: any = { quarterLabel: q };
      groups.forEach((g, idx) => {
         const ts = groupTimeseries[idx];
         const qAgg = ts.find(t => t.quarterLabel === q);
         const shortName = names[idx];
         if (qAgg) {
            Object.keys(qAgg).forEach(key => {
                row[`${shortName}_${key}`] = (qAgg as any)[key];
            });
         }
      });
      return row;
    });
  }, [filteredRawData]);

  const renderBankMetricChart = (title: string, metricKey: string, isPercent: boolean = true, isDays: boolean = false, height: number = 220) => {
    return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h4 className="font-semibold text-gray-700 mb-4 text-sm uppercase">{title}</h4>
             <MixedChart data={pivotsForBankTab} xKey="quarterLabel" isPercent={isPercent} height={height} series={[
                { key: metricKey, name: 'Ngân hàng xem xét', color: '#7bc8d5', type: 'line' },
                { key: `industry_${metricKey}`, name: 'Trung bình ngành', color: '#888888', type: 'line' },
                { key: `group_${metricKey}`, name: 'Trung bình nhóm', color: '#c40000', type: 'line' },
             ]} />
          </div>
    );
  };

  const renderCompareMetricChart = (title: string, metricKey: string, isPercent: boolean = true, isDays: boolean = false, height: number = 220) => {
    const selectedBanksArray = Array.from(compareBanks);
    const series = selectedBanksArray.map((b, idx) => {
      // Use predefined colors, defaulting to grey if we run out
      const color = COLORS[idx % COLORS.length];
      return {
        key: `${metricKey}_${b}`,
        name: b,
        color: color,
        type: 'bar' as const
      };
    });

    return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-700 text-sm uppercase truncate pr-4">{title}</h4>
             </div>
             {series.length > 0 ? (
                <div className="flex flex-wrap gap-x-4 mb-2">
                   <span className="text-xs font-semibold text-gray-600">Ngân hàng</span>
                   {series.map(s => (
                       <div key={s.name} className="flex items-center space-x-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                          <span className="text-xs text-gray-500">{s.name}</span>
                       </div>
                   ))}
                </div>
             ) : null}
             <MixedChart data={pivotsForCompareTab} xKey="quarterLabel" isPercent={isPercent} height={height} series={series} />
          </div>
    );
  };

  const renderMetricChart = (title: string, metricKey: string, isPercent: boolean = true, isDays: boolean = false, height: number = 220) => {
    // Line chart comparing the 4 groups
    return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h4 className="font-semibold text-gray-700 mb-4 text-sm uppercase">{title}</h4>
             <MixedChart data={pivotedGroupData} xKey="quarterLabel" isPercent={isPercent} height={height} series={[
                { key: `Quốc doanh_${metricKey}`, name: 'Quốc doanh', color: '#7bc8d5', type: 'line' },
                { key: `Bán buôn_${metricKey}`, name: 'Bán buôn', color: '#132851', type: 'line' },
                { key: `Bán lẻ_${metricKey}`, name: 'Bán lẻ', color: '#00d39b', type: 'line' },
                { key: `Khác_${metricKey}`, name: 'Khác', color: '#c40000', type: 'line' },
             ]} />
          </div>
    );
  };

  const CellColor: React.FC<{ value: number, type: 'goodHigh' | 'goodLow', key?: React.Key }> = ({ value, type }) => {
    // Basic coloring logic
    let colorClass = 'bg-gray-100 text-gray-800';
    if (type === 'goodHigh') {
      if (value > 20) colorClass = 'bg-green-100 text-green-800 font-medium';
      else if (value > 10) colorClass = 'bg-green-50 text-green-700';
      else if (value > 0) colorClass = 'bg-yellow-50 text-yellow-700';
      else colorClass = 'bg-red-50 text-red-700';
    } else {
      // lower is better
      if (value < 2) colorClass = 'bg-green-100 text-green-800 font-medium';
      else if (value < 5) colorClass = 'bg-green-50 text-green-700';
      else if (value < 10) colorClass = 'bg-yellow-50 text-yellow-700';
      else colorClass = 'bg-red-50 text-red-700';
    }
    return <td className={`px-4 py-2 text-right text-sm ${colorClass}`}>{value.toFixed(2)}%</td>
  };

  const renderTab2Summary = () => {
    if (!latestQuarterAggregatedAllGroups || !latestQuarterAggregatedAllGroups['All']) return null;
    const gList = ['Nhóm quốc doanh', 'Nhóm chuyên cho vay DN', 'Nhóm chuyên cho vay cá nhân', 'Nhóm khác', 'All'];
    const metrics = [
      { key: 'nplRatio', label: 'Tỷ lệ nợ xấu (NPL)', type: 'goodLow' },
      { key: 'llrRatio', label: 'Bao phủ nợ xấu (LLR)', type: 'goodHigh' },
      { key: 'nim', label: 'Biên lãi ròng (NIM)', type: 'goodHigh' },
      { key: 'cir', label: 'Quản lý CP (CIR)', type: 'goodLow' },
      { key: 'roa', label: 'Sinh lời TS (ROA)', type: 'goodHigh' },
      { key: 'roe', label: 'Sinh lời vốn (ROE)', type: 'goodHigh' },
      { key: 'ldr', label: 'Tỷ lệ LDR', type: 'goodLow' },
      { key: 'casa', label: 'Tỷ lệ CASA', type: 'goodHigh' },
    ];

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-12">
        <h4 className="font-semibold text-gray-700 mb-4 uppercase">TÓM TẮT CHỈ SỐ THEO NHÓM - QUÝ LẦN NHẤT ({latestQuarterLabel})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-gray-600">Chỉ số</th>
                {gList.map(g => <th key={g} className="px-4 py-3 font-semibold text-gray-600 text-right">{g === 'All' ? 'Toàn ngành' : g}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, idx) => (
                <tr key={m.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-800">{m.label}</td>
                  {gList.map(g => {
                    const data = latestQuarterAggregatedAllGroups[g];
                    const val = data ? (data as any)[m.key] : 0;
                    return <CellColor key={g} value={val} type={m.type as 'goodHigh' | 'goodLow'} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTab2BottomPanels = () => {
    const groups = ['Nhóm quốc doanh', 'Nhóm chuyên cho vay DN', 'Nhóm chuyên cho vay cá nhân', 'Nhóm khác'];
    
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-12">
        <h4 className="font-semibold text-gray-700 mb-6 uppercase">HIỆU QUẢ HOẠT ĐỘNG (ROE) THEO NGÂN HÀNG - {latestQuarterLabel}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {groups.map(g => {
            const banksInGroup = latestQuarterIndividualData.filter(d => d.group === g);
            const roeData = banksInGroup.map(b => ({
              ticker: b.ticker,
              roe: b.TotalEquity ? (b.PAT / b.TotalEquity) * 4 * 100 : 0
            })).sort((a,b) => b.roe - a.roe);
            
            const groupAvg = latestQuarterAggregatedAllGroups && latestQuarterAggregatedAllGroups[g] ? latestQuarterAggregatedAllGroups[g].roe : 0;

            return (
              <div key={g} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-[#1E3A5F] text-white py-3 px-4 font-semibold text-sm text-center">
                  {g}
                </div>
                <div className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 border-b">
                        <th className="py-2 px-3 text-left font-medium">Mã CK</th>
                        <th className="py-2 px-3 text-right font-medium">ROE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roeData.map(b => {
                        let rowColor = 'text-gray-700';
                        if (b.roe > 20) rowColor = 'text-green-700 bg-green-50 font-medium';
                        else if (b.roe > 10) rowColor = 'text-green-600';
                        else if (b.roe > 0) rowColor = 'text-yellow-600';
                        else rowColor = 'text-red-600 bg-red-50';

                        return (
                          <tr key={b.ticker} className={`border-b border-gray-100 ${rowColor}`}>
                            <td className="py-2 px-3 font-semibold">{b.ticker}</td>
                            <td className="py-2 px-3 text-right">{b.roe.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-semibold text-gray-800">
                        <td className="py-2 px-3 text-left">Trung bình</td>
                        <td className="py-2 px-3 text-right">{groupAvg.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handle quarter selection
  const handleToggleQuarter = (q: string) => {
    const newSet = new Set(selectedQuarters);
    if (newSet.has(q)) {
      newSet.delete(q);
    } else {
      newSet.add(q);
    }
    setSelectedQuarters(newSet);
  };

  const formatterTty = (val: number) => (val / 1000000000000).toFixed(1) + ' nghìn tỷ';
  const formatterTy = (val: number) => (val / 1000000000).toFixed(1) + ' tỷ';

  const renderSection = (title: string, children: React.ReactNode) => (
    <div className="mb-12">
      <h3 className="text-xl font-bold text-[#1E3A5F] border-b-2 border-[#1E3A5F] pb-2 mb-6 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );

  const renderBankTab = () => {
    // raw values for the selected bank over selected quarters
    const dataToUse = filteredRawData.filter(d => d.ticker === selectedBank).sort((a,b) => {
      const numA = parseInt(a.quarterLabel.slice(1,2));
      const yearA = parseInt(a.quarterLabel.slice(3,5));
      const numB = parseInt(b.quarterLabel.slice(1,2));
      const yearB = parseInt(b.quarterLabel.slice(3,5));
      if (yearA !== yearB) return yearA - yearB;
      return numA - numB;
    });

    return (
      <div className="space-y-8">
        {renderSection('1. THEO DÕI CƠ CẤU TÀI SẢN VÀ NGUỒN VỐN', 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Cơ cấu tài sản</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'CashGold', name: 'Tiền mặt, vàng bạc, đá quý', color: COLORS[5], type: 'bar' },
                  { key: 'DepositsSBV', name: 'Tiền gửi tại Ngân hàng nhà nước', color: '#132851', type: 'bar' },
                  { key: 'InterbankAsset', name: 'Tiền gửi và cho vay các TCTD khác', color: '#00d39b', type: 'bar' },
                  { key: 'TradingSecurities', name: 'Chứng khoán kinh doanh ròng', color: '#c40000', type: 'bar' },
                  { key: 'NetCustomerLoans', name: 'Cho vay khách hàng ròng', color: '#e5b32f', type: 'bar' },
                  { key: 'InvestmentSecurities', name: 'Chứng khoán đầu tư', color: '#7bc8d5', type: 'bar' },
                  { key: 'LongTermInvestments', name: 'Góp vốn, đầu tư dài hạn', color: '#8da0cb', type: 'bar' },
                  { key: 'FixedAssets', name: 'Tài sản cố định', color: '#a6cee3', type: 'bar' },
                  { key: 'InvestmentRealEstate', name: 'Bất động sản đầu tư', color: COLORS[6], type: 'bar' },
                  { key: 'OtherAssets', name: 'Tài sản khác', color: '#fb9a99', type: 'bar' },
                ]}
              />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Cơ cấu nguồn vốn</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'GovSBVBorrowings', name: 'Các khoản nợ Chính phủ và NHNN', color: '#8da0cb', type: 'bar' },
                  { key: 'InterbankDepositsLiab', name: 'Tiền gửi và vay các TCTD khác', color: '#132851', type: 'bar' },
                  { key: 'CustomerDeposits', name: 'Tiền gửi của khách hàng', color: '#00d39b', type: 'bar' },
                  { key: 'IssuedValuablePapers', name: 'Phát hành giấy tờ có giá', color: '#c40000', type: 'bar' },
                  { key: 'OtherLiabilities', name: 'Các khoản nợ khác', color: '#e5b32f', type: 'bar' },
                  { key: 'OtherEquity', name: 'Vốn chủ sở hữu khác', color: '#7bc8d5', type: 'bar' },
                  { key: 'SharePremium', name: 'Thặng dư vốn cổ phần', color: '#a6cee3', type: 'bar' },
                  { key: 'CharterCapital', name: 'Vốn điều lệ', color: '#fb9a99', type: 'bar' },
                  { key: 'UndistributedEarnings', name: 'Lợi nhuận chưa phân phối', color: COLORS[6], type: 'bar' },
                ]}
              />
            </div>
          </div>
        )}

        {renderSection('2. THEO DÕI CƠ CẤU LỢI NHUẬN', 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Phân tích lợi nhuận</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                valueFormatter={formatterTy}
                series={[
                  { key: 'TotalOpIncome', name: 'Tổng thu nhập hoạt động', color: COLORS[0], type: 'area' },
                  { key: 'PreProvOpProfit', name: 'Lợi nhuận thuần HĐKD trước DPRRTD', color: '#132851', type: 'area' },
                  { key: 'PBT', name: 'Tổng lợi nhuận trước thuế', color: COLORS[2], type: 'area' },
                  { key: 'PAT', name: 'Lợi nhuận sau thuế', color: COLORS[3], type: 'area' },
                ]}
              />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Cơ cấu lợi nhuận</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'NetInterestIncome', name: 'Thu nhập lãi thuần', color: '#7bc8d5', type: 'bar' },
                  { key: 'NetFeeServiceIncome', name: 'Lãi thuần từ hoạt động dịch vụ', color: '#132851', type: 'bar' },
                  { key: 'FXGoldIncome', name: 'Lãi/(lỗ) thuần từ ngoại hối và vàng', color: '#00d39b', type: 'bar' },
                  { key: 'TradingSecuritiesIncome', name: 'Lãi/(lỗ) thuần từ mua bán CKKD', color: '#c40000', type: 'bar' },
                  { key: 'InvestmentSecuritiesIncome', name: 'Lãi/(lỗ) thuần từ mua bán CKĐT', color: '#e5b32f', type: 'bar' },
                  { key: 'OtherOpIncome', name: 'Lãi/(lỗ) thuần từ hoạt động khác', color: '#a6cee3', type: 'bar' },
                  { key: 'EquityInvestmentIncome', name: 'Thu nhập từ góp vốn, mua cổ phần', color: '#8da0cb', type: 'bar' },
                ]}
              />
            </div>
          </div>
        )}

        {renderSection('3. PHÂN TÍCH TĂNG TRƯỞNG', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderBankMetricChart('TĂNG TRƯỞNG LỢI NHUẬN CỦA NGÂN HÀNG', 'patGrowthYoY')}
             {renderBankMetricChart('TĂNG TRƯỞNG TÍN DỤNG CỦA NGÂN HÀNG', 'loanGrowthYoY')}
          </div>
        )}

        {renderSection('4. PHÂN TÍCH AN TOÀN VỐN', 
          <div className="grid grid-cols-1 gap-6">
             {renderBankMetricChart('ĐÒN BẨY TÀI CHÍNH (A/E)', 'aeRatio', false)}
          </div>
        )}

        {renderSection('5. PHÂN TÍCH CHẤT LƯỢNG TÀI SẢN', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderBankMetricChart('TỶ LỆ NỢ XẤU (NPL)', 'nplRatio')}
             {renderBankMetricChart('TỶ LỆ NỢ QUÁ HẠN', 'overdueRatio')}
             {renderBankMetricChart('TỶ LỆ BAO PHỦ NỢ XẤU (LLR)', 'llrRatio')}
             {renderBankMetricChart('DỰ PHÒNG RỦI RO TÍN DỤNG/CHO VAY', 'creditProvRatio')}
          </div>
        )}

        {renderSection('6. PHÂN TÍCH HIỆU QUẢ QUẢN TRỊ', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {renderBankMetricChart('CHI PHÍ HOẠT ĐỘNG/THU NHẬP HOẠT ĐỘNG (CIR)', 'cir')}
             {renderBankMetricChart('CHI PHÍ LÃI/TIỀN GỬI KHÁCH HÀNG', 'intExpDeposits')}
             {renderBankMetricChart('CHI PHÍ HOẠT ĐỘNG/TỔNG TÀI SẢN', 'opOpexAssets')}
          </div>
        )}

        {renderSection('7. PHÂN TÍCH MỨC SINH LỜI', 
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {renderBankMetricChart('CHI PHÍ VỐN (COF)', 'cof')}
               {renderBankMetricChart('MỨC SINH LỜI TRÊN TÀI SẢN (YEA)', 'yea')}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {renderBankMetricChart('CHÊNH LỆCH LÃI SUẤT ĐẦU VÀO ĐẦU RA (NIM)', 'nim')}
               {renderBankMetricChart('TỶ LỆ THU NHẬP THUẦN TỪ HOẠT ĐỘNG DỊCH VỤ', 'feeIncRatio')}
               {renderBankMetricChart('SỐ NGÀY LÃI PHẢI THU', 'accruedIntDays', false, true)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {renderBankMetricChart('LNST/TTS (ROA)', 'roa')}
               {renderBankMetricChart('LNST/VCSH (ROE)', 'roe')}
            </div>
          </div>
        )}

        {renderSection('8. PHÂN TÍCH THANH KHOẢN', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {renderBankMetricChart('TIỀN GỬI KHÔNG KỲ HẠN/TỔNG TIỀN GỬI (CASA)', 'casa')}
             {renderBankMetricChart('DƯ NỢ CẤP TÍN DỤNG/VỐN HUY ĐỘNG (LDR)', 'ldr')}
             {renderBankMetricChart('TÀI SẢN THANH KHOẢN CAO/TỔNG TÀI SẢN', 'highLiqRatio')}
          </div>
        )}

      </div>
    );
  };

  const renderCompareTab = () => {
    return (
      <div className="space-y-8">
        
        {renderSection('PHÂN TÍCH TĂNG TRƯỞNG', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderCompareMetricChart('SO SÁNH TĂNG TRƯỞNG LỢI NHUẬN CÁC NGÂN HÀNG', 'patGrowthYoY', true, false, 280)}
             {renderCompareMetricChart('SO SÁNH TĂNG TRƯỞNG TÍN DỤNG CÁC NGÂN HÀNG', 'loanGrowthYoY', true, false, 280)}
          </div>
        )}

        {renderSection('PHÂN TÍCH AN TOÀN VỐN', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderCompareMetricChart('ĐÒN BẨY TÀI CHÍNH (A/E)', 'aeRatio', false, false, 280)}
          </div>
        )}

        {renderSection('PHÂN TÍCH CHẤT LƯỢNG TÀI SẢN', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderCompareMetricChart('TỶ LỆ NỢ XẤU (NPL)', 'nplRatio', true, false, 280)}
             {renderCompareMetricChart('TỶ LỆ NỢ QUÁ HẠN', 'overdueRatio', true, false, 280)}
             {renderCompareMetricChart('TỶ LỆ BAO PHỦ NỢ XẤU (LLR)', 'llrRatio', true, false, 280)}
             {renderCompareMetricChart('DỰ PHÒNG RỦI RO TÍN DỤNG/CHO VAY', 'creditProvRatio', true, false, 280)}
          </div>
        )}

        {renderSection('PHÂN TÍCH HIỆU QUẢ QUẢN TRỊ', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {renderCompareMetricChart('CHI PHÍ HOẠT ĐỘNG/THU NHẬP HOẠT ĐỘNG (CIR)', 'cir', true, false, 280)}
             {renderCompareMetricChart('CHI PHÍ LÃI/TIỀN GỬI KHÁCH HÀNG', 'intExpDeposits', true, false, 280)}
             {renderCompareMetricChart('CHI PHÍ HOẠT ĐỘNG/TỔNG TÀI SẢN', 'opOpexAssets', true, false, 280)}
          </div>
        )}

        {renderSection('PHÂN TÍCH MỨC SINH LỜI', 
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {renderCompareMetricChart('CHI PHÍ VỐN (COF)', 'cof', true, false, 280)}
               {renderCompareMetricChart('MỨC SINH LỜI TRÊN TÀI SẢN (YEA)', 'yea', true, false, 280)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {renderCompareMetricChart('CHÊNH LỆCH LÃI SUẤT ĐẦU VÀO ĐẦU RA (NIM)', 'nim', true, false, 280)}
               {renderCompareMetricChart('TỶ LỆ THU NHẬP THUẦN TỪ HOẠT ĐỘNG DỊCH VỤ', 'feeIncRatio', true, false, 280)}
               {renderCompareMetricChart('SỐ NGÀY LÃI PHẢI THU', 'accruedIntDays', false, true, 280)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {renderCompareMetricChart('LNST/TTS (ROA)', 'roa', true, false, 280)}
               {renderCompareMetricChart('LNST/VCSH (ROE)', 'roe', true, false, 280)}
            </div>
          </div>
        )}

        {renderSection('PHÂN TÍCH THANH KHOẢN', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {renderCompareMetricChart('TIỀN GỬI KHÔNG KỲ HẠN/TỔNG TIỀN GỬI (CASA)', 'casa', true, false, 280)}
             {renderCompareMetricChart('DƯ NỢ CẤP TÍN DỤNG/VỐN HUY ĐỘNG (LDR)', 'ldr', true, false, 280)}
             {renderCompareMetricChart('TÀI SẢN THANH KHOẢN CAO/TỔNG TÀI SẢN', 'highLiqRatio', true, false, 280)}
          </div>
        )}

      </div>
    );
  };

  const renderValuationTab = () => {
    const groups = ['Nhóm quốc doanh', 'Nhóm chuyên cho vay DN', 'Nhóm chuyên cho vay cá nhân', 'Nhóm khác'];
    
    // Sort quarters exactly as in the chart data
    const sortedQuarters = Array.from(selectedQuarters).sort((a: string, b: string) => {
      const numA = parseInt(a.slice(1,2));
      const yearA = parseInt(a.slice(3,5));
      const numB = parseInt(b.slice(1,2));
      const yearB = parseInt(b.slice(3,5));
      if (yearA !== yearB) return yearA - yearB;
      return numA - numB;
    });

    const renderValuationGroupChart = (groupName: string, title: string) => {
      const banksInGroup = allBanks.filter(b => BANK_GROUPS[b] === groupName).sort();
      const series = banksInGroup.map((b, idx) => ({
        key: `${valuationMetric}_${b}`,
        name: b,
        color: COLORS[idx % COLORS.length],
        type: 'line' as const
      }));

      return (
        <div className="bg-[#F8F9FA] p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-gray-800 text-sm uppercase truncate pr-4">{title}</h4>
           </div>
           {series.length > 0 ? (
              <div className="flex flex-wrap gap-x-4 mb-2">
                 <span className="text-xs font-semibold text-gray-600">Ngân hàng</span>
                 {series.map(s => (
                     <div key={s.name} className="flex items-center space-x-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                        <span className="text-xs text-gray-500">{s.name}</span>
                     </div>
                 ))}
              </div>
           ) : null}
           <MixedChart data={bankPivotsForValuation} xKey="quarterLabel" isPercent={false} height={250} series={series} />
        </div>
      );
    };

    const getHeatmapColor = (val: number | null, metric: 'PB' | 'PE') => {
      if (typeof val !== 'number' || isNaN(val) || val === 0) return 'transparent';
      const max = metric === 'PB' ? 4 : 20;
      const ratio = Math.max(0, Math.min(1, val / max));
      return `rgba(0, 180, 216, ${ratio * 0.7})`; // max opacity 0.7 to keep text readable
    };

    return (
      <div className="space-y-8">
        {/* 5.1 ĐỊNH GIÁ THEO NHÓM NGÂN HÀNG */}
        <div className="bg-[#023E8A] text-white p-4 font-bold text-xl uppercase rounded-t-xl mb-4">
          5.1. ĐỊNH GIÁ THEO NHÓM NGÂN HÀNG
        </div>
        
        <div className="flex flex-wrap gap-x-8 gap-y-4 items-end mb-8">
           <div className="bg-white p-4 rounded-xl flex flex-wrap gap-x-8 gap-y-4 items-end shadow-sm">
             {renderQuarterSelect(showQuarterDropdown51, setShowQuarterDropdown51)}
             
             <div className="min-w-[200px]">
               <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Chỉ tiêu</label>
               <div className="flex space-x-4 h-10 items-center">
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input type="radio" checked={valuationMetric === 'PB'} onChange={() => setValuationMetric('PB')} className="text-[#1E3A5F] focus:ring-[#1E3A5F]" />
                   <span>P/B</span>
                 </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input type="radio" checked={valuationMetric === 'PE'} onChange={() => setValuationMetric('PE')} className="text-[#1E3A5F] focus:ring-[#1E3A5F]" />
                   <span>P/E</span>
                 </label>
               </div>
             </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-4 uppercase text-sm">Định giá toàn ngành</h4>
          <MixedChart data={industryData} xKey="quarterLabel" isPercent={false} height={250} series={[
            { key: valuationMetric, name: valuationMetric, color: '#00B4D8', type: 'line' }
          ]} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-4 uppercase text-sm">Định giá theo nhóm ngân hàng</h4>
          <div className="flex flex-wrap gap-x-4 mb-2">
             <span className="text-xs font-semibold text-gray-600">Nhóm Ngân hàng</span>
             <div className="flex items-center space-x-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[0] }}></div><span className="text-xs text-gray-500">Quốc doanh</span></div>
             <div className="flex items-center space-x-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[1] }}></div><span className="text-xs text-gray-500">Bán buôn</span></div>
             <div className="flex items-center space-x-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[2] }}></div><span className="text-xs text-gray-500">Bán lẻ</span></div>
             <div className="flex items-center space-x-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[3] }}></div><span className="text-xs text-gray-500">Khác</span></div>
          </div>
          <MixedChart data={pivotedGroupData} xKey="quarterLabel" isPercent={false} height={250} series={[
            { key: `Quốc doanh_${valuationMetric}`, name: 'Quốc doanh', color: COLORS[0], type: 'line' },
            { key: `Bán buôn_${valuationMetric}`, name: 'Bán buôn', color: COLORS[1], type: 'line' },
            { key: `Bán lẻ_${valuationMetric}`, name: 'Bán lẻ', color: COLORS[2], type: 'line' },
            { key: `Khác_${valuationMetric}`, name: 'Khác', color: COLORS[3], type: 'line' }
          ]} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {renderValuationGroupChart('Nhóm quốc doanh', 'ĐỊNH GIÁ NHÓM NGÂN HÀNG QUỐC DOANH')}
           {renderValuationGroupChart('Nhóm chuyên cho vay DN', 'ĐỊNH GIÁ NHÓM NGÂN HÀNG BÁN BUÔN')}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {renderValuationGroupChart('Nhóm chuyên cho vay cá nhân', 'ĐỊNH GIÁ NHÓM NGÂN HÀNG BÁN LẺ')}
           {renderValuationGroupChart('Nhóm khác', 'ĐỊNH GIÁ NHÓM NGÂN HÀNG KHÁC')}
        </div>

        {/* 5.2 ĐỊNH GIÁ TỪNG NGÂN HÀNG */}
        <div className="bg-[#023E8A] text-white p-4 font-bold text-xl uppercase rounded-t-xl mt-12 mb-4">
          5.2. ĐỊNH GIÁ TỪNG NGÂN HÀNG
        </div>
        
        <div className="flex flex-wrap gap-x-8 gap-y-4 items-end mb-8">
           <div className="bg-white p-4 rounded-xl flex flex-wrap gap-x-8 gap-y-4 items-end shadow-sm">
             {renderQuarterSelect(showQuarterDropdown52, setShowQuarterDropdown52)}
             
             <div className="min-w-[300px] relative">
               <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Ngân hàng</label>
               <button
                 className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 flex justify-between items-center w-full text-left focus:ring-2 focus:ring-[#1E3A5F] outline-none"
                 onClick={() => setShowValuationBankDropdown(!showValuationBankDropdown)}
               >
                 <span className="truncate pr-4">
                   {valuationBanks.size === Object.keys(allBanks).length ? 'Tất cả' :
                     valuationBanks.size === 0 ? 'Chọn ngân hàng...' :
                     `Đã chọn ${valuationBanks.size} ngân hàng`}
                 </span>
                 <svg className={`w-5 h-5 text-gray-400 transition-transform ${showValuationBankDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
               </button>

               {showValuationBankDropdown && (
                 <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                   <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                     <label className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                       <input
                         type="checkbox"
                         checked={valuationBanks.size === allBanks.length}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setValuationBanks(new Set(allBanks));
                           } else {
                             setValuationBanks(new Set());
                           }
                         }}
                         className="rounded text-[#1E3A5F] focus:ring-[#1E3A5F]"
                       />
                       <span className="font-medium">Tất cả ngân hàng</span>
                     </label>
                   </div>
                   <div className="p-2">
                     {allBanks.map((b) => (
                       <label key={b} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                         <input
                           type="checkbox"
                           checked={valuationBanks.has(b)}
                           onChange={(e) => {
                             const newSet = new Set(valuationBanks);
                             if (e.target.checked) {
                               newSet.add(b);
                             } else {
                               newSet.delete(b);
                             }
                             setValuationBanks(newSet);
                           }}
                           className="rounded text-[#1E3A5F] focus:ring-[#1E3A5F]"
                         />
                         <span className="text-gray-700">{b}</span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}
             </div>
             
             <div className="min-w-[200px]">
               <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Chỉ tiêu</label>
               <div className="flex space-x-4 h-10 items-center">
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input type="radio" checked={valuationMetric2 === 'PB'} onChange={() => setValuationMetric2('PB')} className="text-[#1E3A5F] focus:ring-[#1E3A5F]" />
                   <span>P/B</span>
                 </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input type="radio" checked={valuationMetric2 === 'PE'} onChange={() => setValuationMetric2('PE')} className="text-[#1E3A5F] focus:ring-[#1E3A5F]" />
                   <span>P/E</span>
                 </label>
               </div>
             </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <h4 className="font-bold text-gray-800 mb-4 uppercase text-sm">Định giá theo ngân hàng</h4>
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-semibold border-b">
                <th className="py-2 px-3 text-left w-32 border-r">Nhóm ngân hàng</th>
                {sortedQuarters.map(q => <th key={q} className="py-2 px-3 border-r last:border-r-0 whitespace-nowrap">{q}</th>)}
              </tr>
            </thead>
            <tbody>
              {groups.map(group => {
                const bInGroup = allBanks.filter(b => BANK_GROUPS[b] === group && valuationBanks.has(b)).sort();
                if (bInGroup.length === 0) return null;
                
                return (
                  <React.Fragment key={group}>
                    <tr className="bg-gray-100 font-semibold border-b">
                      <td className="py-2 px-3 text-left border-r text-[#1E3A5F]">
                        <span className="mr-2">⊟</span> {group === 'Nhóm quốc doanh' ? 'Quốc doanh' : group === 'Nhóm chuyên cho vay DN' ? 'Bán buôn' : group === 'Nhóm chuyên cho vay cá nhân' ? 'Bán lẻ' : 'Khác'}
                      </td>
                      {sortedQuarters.map(q => {
                        const groupStats = pivotedGroupData.find(d => d.quarterLabel === q);
                        const val = groupStats ? groupStats[`${valuationMetric2}_${group}` as keyof typeof groupStats] as number : null;
                        return (
                          <td key={q} style={{ backgroundColor: getHeatmapColor(val, valuationMetric2) }} className="py-2 px-3 font-bold border-r last:border-r-0">
                            {typeof val === 'number' ? val.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                    {bInGroup.map(b => (
                      <tr key={b} className="border-b hover:bg-gray-50">
                        <td className="py-1 px-3 pl-8 text-left text-gray-600 border-r">{b}</td>
                        {sortedQuarters.map(q => {
                          const bankStats = bankPivotsForValuation.find(d => d.quarterLabel === q);
                          const val = bankStats ? bankStats[`${valuationMetric2}_${b}`] : null;
                          return (
                            <td key={q} style={{ backgroundColor: getHeatmapColor(val, valuationMetric2) }} className="py-1 px-3 border-r last:border-r-0 text-gray-800">
                              {typeof val === 'number' ? val.toFixed(2) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderGroupTab = () => {
    const dataToUse = groupAggregatedData;

    return (
      <div className="space-y-8">
        {renderTab2Summary()}

        {renderSection('1. THEO DÕI CƠ CẤU TÀI SẢN VÀ NGUỒN VỐN', 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Cơ cấu tài sản</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'CashGold', name: 'Tiền mặt, vàng bạc, đá quý', color: COLORS[5], type: 'bar' },
                  { key: 'DepositsSBV', name: 'Tiền gửi tại Ngân hàng nhà nước', color: '#132851', type: 'bar' },
                  { key: 'InterbankAsset', name: 'Tiền gửi và cho vay các TCTD khác', color: '#00d39b', type: 'bar' },
                  { key: 'TradingSecurities', name: 'Chứng khoán kinh doanh ròng', color: '#c40000', type: 'bar' },
                  { key: 'NetCustomerLoans', name: 'Cho vay khách hàng ròng', color: '#e5b32f', type: 'bar' },
                  { key: 'InvestmentSecurities', name: 'Chứng khoán đầu tư', color: '#7bc8d5', type: 'bar' },
                  { key: 'LongTermInvestments', name: 'Góp vốn, đầu tư dài hạn', color: '#8da0cb', type: 'bar' },
                  { key: 'FixedAssets', name: 'Tài sản cố định', color: '#a6cee3', type: 'bar' },
                  { key: 'InvestmentRealEstate', name: 'Bất động sản đầu tư', color: COLORS[6], type: 'bar' },
                  { key: 'OtherAssets', name: 'Tài sản khác', color: '#fb9a99', type: 'bar' },
                ]}
              />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Cơ cấu nguồn vốn</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'GovSBVBorrowings', name: 'Các khoản nợ Chính phủ và NHNN', color: '#8da0cb', type: 'bar' },
                  { key: 'InterbankDepositsLiab', name: 'Tiền gửi và vay các TCTD khác', color: '#132851', type: 'bar' },
                  { key: 'CustomerDeposits', name: 'Tiền gửi của khách hàng', color: '#00d39b', type: 'bar' },
                  { key: 'IssuedValuablePapers', name: 'Phát hành giấy tờ có giá', color: '#c40000', type: 'bar' },
                  { key: 'OtherLiabilities', name: 'Các khoản nợ khác', color: '#e5b32f', type: 'bar' },
                  { key: 'OtherEquity', name: 'Vốn chủ sở hữu khác', color: '#7bc8d5', type: 'bar' },
                  { key: 'SharePremium', name: 'Thặng dư vốn cổ phần', color: '#fb9a99', type: 'bar' },
                  { key: 'CharterCapital', name: 'Vốn điều lệ', color: '#a6cee3', type: 'bar' },
                  { key: 'RetainedEarnings', name: 'Lợi nhuận chưa phân phối lũy kế', color: '#01579b', type: 'bar' },
                ]}
              />
            </div>
          </div>
        )}

        {renderSection('2. THEO DÕI CƠ CẤU LỢI NHUẬN', 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Phân tích lợi nhuận</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                series={[
                  { key: 'TotalOpIncome', name: 'Tổng thu nhập hoạt động', color: COLORS[0], type: 'area' },
                  { key: 'PreProvOpProfit', name: 'Lợi nhuận thuần HĐKD trước DPRRTD', color: COLORS[1], type: 'area' },
                  { key: 'PBT', name: 'Tổng lợi nhuận trước thuế', color: COLORS[2], type: 'area' },
                  { key: 'PAT', name: 'Lợi nhuận sau thuế', color: COLORS[3], type: 'area' },
                ]}
              />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 uppercase">Cơ cấu lợi nhuận</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'NetInterestIncome', name: 'Thu nhập lãi thuần', color: COLORS[0], type: 'bar' },
                  { key: 'NetFeeServiceIncome', name: 'Lãi thuần từ hoạt động dịch vụ', color: COLORS[1], type: 'bar' },
                  { key: 'FXGoldIncome', name: 'Lãi/(lỗ) thuần từ ngoại hối và vàng', color: COLORS[2], type: 'bar' },
                  { key: 'TradingSecuritiesIncome', name: 'Lãi/(lỗ) thuần từ mua bán CKKD', color: COLORS[3], type: 'bar' },
                  { key: 'InvestmentSecuritiesIncome', name: 'Lãi/(lỗ) thuần từ mua bán CKĐT', color: '#e5b32f', type: 'bar' },
                  { key: 'OtherOpIncome', name: 'Lãi/(lỗ) thuần từ hoạt động khác', color: COLORS[5], type: 'bar' },
                  { key: 'EquityInvestmentIncome', name: 'Thu nhập từ góp vốn, mua cổ phần', color: COLORS[6], type: 'bar' },
                ]}
              />
            </div>
          </div>
        )}

        {renderSection('3. PHÂN TÍCH TĂNG TRƯỞNG', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderMetricChart('TĂNG TRƯỞNG LỢI NHUẬN THEO NHÓM NGÂN HÀNG', 'patGrowthYoY')}
             {renderMetricChart('TĂNG TRƯỞNG TÍN DỤNG THEO NHÓM NGÂN HÀNG', 'loanGrowthYoY')}
          </div>
        )}

        {renderSection('4. PHÂN TÍCH AN TOÀN VỐN', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderMetricChart('ĐÒN BẨY TÀI CHÍNH (A/E)', 'aeRatio', false)}
          </div>
        )}

        {renderSection('5. PHÂN TÍCH CHẤT LƯỢNG TÀI SẢN', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {renderMetricChart('TỶ LỆ NỢ XẤU (NPL)', 'nplRatio')}
             {renderMetricChart('TỶ LỆ NỢ QUÁ HẠN', 'overdueRatio')}
             {renderMetricChart('TỶ LỆ BAO PHỦ NỢ XẤU (LLR)', 'llrRatio')}
             {renderMetricChart('DỰ PHÒNG RỦI RO TÍN DỤNG/CHO VAY', 'creditProvRatio')}
          </div>
        )}

        {renderSection('6. PHÂN TÍCH HIỆU QUẢ QUẢN TRỊ', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {renderMetricChart('CHI PHÍ HOẠT ĐỘNG/THU NHẬP HOẠT ĐỘNG (CIR)', 'cir')}
             {renderMetricChart('CHI PHÍ LÃI/TIỀN GỬI KHÁCH HÀNG', 'intExpDeposits')}
             {renderMetricChart('CHI PHÍ HOẠT ĐỘNG/TỔNG TÀI SẢN', 'opOpexAssets')}
          </div>
        )}

        {renderSection('7. PHÂN TÍCH MỨC SINH LỜI', 
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {renderMetricChart('CHI PHÍ VỐN (COF)', 'cof')}
               {renderMetricChart('MỨC SINH LỜI TRÊN TÀI SẢN (YEA)', 'yea')}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {renderMetricChart('CHÊNH LỆCH LÃI SUẤT ĐẦU VÀO ĐẦU RA (NIM)', 'nim')}
               {renderMetricChart('TỶ LỆ THU NHẬP THUẦN TỪ HOẠT ĐỘNG DỊCH VỤ', 'feeIncRatio')}
               {renderMetricChart('SỐ NGÀY LÃI PHẢI THU', 'accruedIntDays', false, true)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {renderMetricChart('LNST/TTS (ROA)', 'roa')}
               {renderMetricChart('LNST/VCSH (ROE)', 'roe')}
            </div>
          </div>
        )}

        {renderSection('8. PHÂN TÍCH THANH KHOẢN', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {renderMetricChart('TIỀN GỬI KHÔNG KỲ HẠN/TỔNG TIỀN GỬI (CASA)', 'casa')}
             {renderMetricChart('DƯ NỢ CẤP TÍN DỤNG/VỐN HUY ĐỘNG (LDR)', 'ldr')}
             {renderMetricChart('TÀI SẢN THANH KHOẢN CAO/TỔNG TÀI SẢN', 'highLiqRatio')}
          </div>
        )}

        {renderTab2BottomPanels()}
      </div>
    );
  };

  const renderTab1 = () => {
    const dataToUse = activeTab === 'industry' ? industryData : groupAggregatedData;

    return (
      <div className="space-y-8">
        {renderSection('1. THEO DÕI CƠ CẤU TÀI SẢN VÀ NGUỒN VỐN', 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">CƠ CẤU TÀI SẢN</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'CashGold', name: 'Tiền mặt, vàng bạc, đá quý', color: COLORS[5], type: 'bar' },
                  { key: 'DepositsSBV', name: 'Tiền gửi NHNN', color: COLORS[1], type: 'bar' },
                  { key: 'InterbankAsset', name: 'Tiền gửi & cho vay TCTD', color: COLORS[0], type: 'bar' },
                  { key: 'TradingSecurities', name: 'CK kinh doanh ròng', color: COLORS[3], type: 'bar' },
                  { key: 'NetCustomerLoans', name: 'Cho vay khách hàng ròng', color: COLORS[4], type: 'bar' },
                  { key: 'InvestmentSecurities', name: 'CK đầu tư', color: '#66c2a5', type: 'bar' },
                  { key: 'LongTermInvestments', name: 'Góp vốn, ĐT dài hạn', color: '#8da0cb', type: 'bar' },
                  { key: 'FixedAssets', name: 'Tài sản cố định', color: '#a6cee3', type: 'bar' },
                  { key: 'InvestmentRealEstate', name: 'BĐS đầu tư', color: COLORS[6], type: 'bar' },
                  { key: 'OtherAssets', name: 'Tài sản khác', color: '#fb9a99', type: 'bar' },
                ]}
              />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">CƠ CẤU NGUỒN VỐN</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'GovSBVBorrowings', name: 'Nợ CP & NHNN', color: COLORS[6], type: 'bar' },
                  { key: 'InterbankDepositsLiab', name: 'Tiền gửi & vay TCTD', color: COLORS[1], type: 'bar' },
                  { key: 'CustomerDeposits', name: 'Tiền gửi khách hàng', color: COLORS[0], type: 'bar' },
                  { key: 'IssuedValuablePapers', name: 'Phát hành GTCG', color: COLORS[3], type: 'bar' },
                  { key: 'OtherLiabilities', name: 'Các khoản nợ khác', color: COLORS[4], type: 'bar' },
                  { key: 'InstCapital', name: 'Vốn CSH khác', color: COLORS[5], type: 'bar' },
                  { key: 'SharePremium', name: 'Thặng dư vốn', color: COLORS[9], type: 'bar' },
                  { key: 'CharterCapital', name: 'Vốn điều lệ', color: '#fb9a99', type: 'bar' },
                  { key: 'RetainedEarnings', name: 'LN chưa phân phối', color: '#e5c494', type: 'bar' },
                ]}
              />
            </div>
          </div>
        )}

        {renderSection('2. THEO DÕI CƠ CẤU LỢI NHUẬN', 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">PHÂN TÍCH LỢI NHUẬN</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                valueFormatter={formatterTy}
                series={[
                  { key: 'TotalOpIncome', name: 'Tổng TN hoạt động', color: COLORS[5], type: 'area' },
                  { key: 'PreProvOpProfit', name: 'LNTT trước DPRRTD', color: COLORS[1], type: 'area' },
                  { key: 'PBT', name: 'Tổng LNTT', color: COLORS[0], type: 'area' },
                  { key: 'PAT', name: 'Lợi nhuận sau thuế', color: COLORS[3], type: 'line' },
                ]}
              />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">CƠ CẤU LỢI NHUẬN</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                stacked
                is100Percent
                series={[
                  { key: 'NetInterestIncome', name: 'TN lãi thuần', color: COLORS[5], type: 'bar' },
                  { key: 'NetFeeServiceIncome', name: 'Lãi HĐ dịch vụ', color: COLORS[1], type: 'bar' },
                  { key: 'FXGoldIncome', name: 'Lãi ngoại hối/vàng', color: COLORS[0], type: 'bar' },
                  { key: 'TradingSecuritiesIncome', name: 'Lãi mua bán CKKD', color: COLORS[3], type: 'bar' },
                  { key: 'InvestmentSecuritiesIncome', name: 'Lãi mua bán CKĐT', color: COLORS[4], type: 'bar' },
                  { key: 'OtherOpIncome', name: 'Lãi HĐ khác', color: COLORS[2], type: 'bar' },
                  { key: 'EquityInvestmentIncome', name: 'TN góp vốn', color: COLORS[6], type: 'bar' },
                ]}
              />
            </div>
          </div>
        )}

        {renderSection('3. PHÂN TÍCH TĂNG TRƯỞNG', 
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4">TĂNG TRƯỞNG LỢI NHUẬN {activeTab === 'industry' ? 'TOÀN NGÀNH' : 'NHÓM'} (YoY)</h4>
                <MixedChart
                  data={dataToUse}
                  xKey="quarterLabel"
                  isPercent
                  series={[
                    { key: 'patGrowthYoY', name: 'Tăng trưởng LNST', color: COLORS[1], type: 'bar' },
                  ]}
                />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4">TĂNG TRƯỞNG TÍN DỤNG {activeTab === 'industry' ? 'TOÀN NGÀNH' : 'NHÓM'} (YoY)</h4>
                <MixedChart
                  data={dataToUse}
                  xKey="quarterLabel"
                  isPercent
                  series={[
                    { key: 'loanGrowthYoY', name: 'Tăng trưởng Tín dụng', color: COLORS[1], type: 'bar' },
                  ]}
                />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">ĐÒN BẨY TÀI CHÍNH (A/E)</h4>
              <MixedChart
                data={dataToUse}
                xKey="quarterLabel"
                height={200}
                series={[
                  { key: 'aeRatio', name: 'A/E', color: COLORS[0], type: 'bar' },
                ]}
              />
            </div>
          </div>
        )}

        {renderSection('4. PHÂN TÍCH CHẤT LƯỢNG TÀI SẢN', 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">TỶ LỆ NỢ XẤU (NPL)</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={220} series={[{ key: 'nplRatio', name: 'NPL', color: COLORS[0], type: 'bar' }]} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">TỶ LỆ NỢ QUÁ HẠN</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={220} series={[{ key: 'overdueRatio', name: 'Nợ quá hạn', color: COLORS[0], type: 'bar' }]} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">TỶ LỆ BAO PHỦ NỢ XẤU (LLR)</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={220} series={[{ key: 'llrRatio', name: 'LLR', color: COLORS[0], type: 'bar' }]} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">DỰ PHÒNG RRTD/CHO VAY</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={220} series={[{ key: 'creditProvRatio', name: 'DPRR/Cho vay', color: COLORS[0], type: 'bar' }]} />
            </div>
          </div>
        )}

        {renderSection('5. PHÂN TÍCH HIỆU QUẢ QUẢN TRỊ', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 text-sm">CHI PHÍ HĐ/THU NHẬP HĐ (CIR)</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'cir', name: 'CIR', color: COLORS[4], type: 'bar' }]} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 text-sm">CHI PHÍ LÃI/TIỀN GỬI KH</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'intExpDeposits', name: 'Chi phí lãi/Tiền gửi KH', color: COLORS[4], type: 'bar' }]} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 text-sm">CHI PHÍ HĐ/TỔNG TÀI SẢN</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'opOpexAssets', name: 'CPHĐ/Tổng TS', color: COLORS[4], type: 'bar' }]} />
            </div>
          </div>
        )}

        {renderSection('6. PHÂN TÍCH MỨC SINH LỜI', 
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4">CHI PHÍ VỐN (COF)</h4>
                <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'cof', name: 'COF', color: COLORS[2], type: 'bar' }]} />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4">MỨC SINH LỜI TRÊN TS (YEA)</h4>
                <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'yea', name: 'YEA', color: COLORS[2], type: 'bar' }]} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4 text-sm">CHÊNH LỆCH LÃI SUẤT (NIM)</h4>
                <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'nim', name: 'NIM', color: COLORS[2], type: 'bar' }]} />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4 text-sm">TỶ LỆ TN THUẦN HĐ DỊCH VỤ</h4>
                <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'feeIncRatio', name: 'Tỷ lệ HĐ Dịch vụ', color: COLORS[2], type: 'bar' }]} />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4 text-sm">SỐ NGÀY LÃI PHẢI THU</h4>
                <MixedChart data={dataToUse} xKey="quarterLabel" height={200} series={[{ key: 'accruedIntDays', name: 'Ngày', color: COLORS[2], type: 'bar' }]} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4">LNST/TTS (ROA)</h4>
                <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'roa', name: 'ROA', color: COLORS[2], type: 'bar' }]} />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-4">LNST/VCSH (ROE)</h4>
                <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'roe', name: 'ROE', color: COLORS[2], type: 'bar' }]} />
              </div>
            </div>
          </div>
        )}

        {renderSection('7. PHÂN TÍCH THANH KHOẢN', 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 text-sm">TG KHÔNG KỲ HẠN/TỔNG TG (CASA)</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'casa', name: 'CASA', color: COLORS[0], type: 'bar' }]} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 text-sm">DƯ NỢ CẤP TÍN DỤNG/VỐN HUY ĐỘNG (LDR)</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'ldr', name: 'LDR', color: COLORS[0], type: 'bar' }]} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4 text-sm">TS THANH KHOẢN CAO/TỔNG TS</h4>
              <MixedChart data={dataToUse} xKey="quarterLabel" isPercent height={200} series={[{ key: 'highLiqRatio', name: 'Tỷ lệ TSTK', color: COLORS[0], type: 'bar' }]} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const selectedQuartersText = selectedQuarters.size === allQuarters.length ? 'Tất cả' : selectedQuarters.size > 2 ? 'Nhiều lựa chọn' : Array.from(selectedQuarters).join(', ');

  const renderQuarterSelect = (dropdownState: boolean, setDropdownState: (val: boolean) => void) => (
    <div className="relative min-w-[200px]">
      <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Thời gian</label>
      <button
        onClick={() => setDropdownState(!dropdownState)}
        className="flex items-center w-full space-x-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 justify-between"
      >
        <span className="truncate">{selectedQuartersText}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
      </button>
      {dropdownState && (
        <div className="absolute top-[4.5rem] left-0 w-64 bg-white border border-gray-200 shadow-lg rounded-xl z-50 p-2 max-h-80 overflow-y-auto">
          <div className="flex justify-between border-b pb-2 mb-2 px-2">
            <button 
              className="text-sm text-[#00B4D8] hover:underline"
              onClick={() => setSelectedQuarters(new Set(allQuarters))}
            >Chọn tất cả</button>
            <button 
              className="text-sm text-red-500 hover:underline"
              onClick={() => setSelectedQuarters(new Set())}
            >Bỏ chọn tất cả</button>
          </div>
          <div className="flex flex-col space-y-1">
            {allQuarters.map(q => (
              <label key={q} className="flex items-center space-x-3 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuarters.has(q)}
                  onChange={(e) => {
                    const newSet = new Set(selectedQuarters);
                    if (e.target.checked) newSet.add(q);
                    else newSet.delete(q);
                    setSelectedQuarters(newSet);
                  }}
                  className="rounded text-[#00B4D8] focus:ring-[#00B4D8]"
                />
                <span className="text-gray-700">{q}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-8">
      {/* Tab Controls */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`pb-4 px-6 font-semibold transition-colors ${activeTab === 'industry' ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]' : 'text-gray-500 hover:text-[#1E3A5F]'}`}
          onClick={() => setActiveTab('industry')}
        >
          Toàn ngành
        </button>
        <button
          className={`pb-4 px-6 font-semibold transition-colors ${activeTab === 'group' ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]' : 'text-gray-500 hover:text-[#1E3A5F]'}`}
          onClick={() => setActiveTab('group')}
        >
          Theo nhóm ngân hàng
        </button>
        <button
          className={`pb-4 px-6 font-semibold transition-colors ${activeTab === 'bank' ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]' : 'text-gray-500 hover:text-[#1E3A5F]'}`}
          onClick={() => setActiveTab('bank')}
        >
          Phân tích ngân hàng
        </button>
        <button
          className={`pb-4 px-6 font-semibold transition-colors ${activeTab === 'compare' ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]' : 'text-gray-500 hover:text-[#1E3A5F]'}`}
          onClick={() => setActiveTab('compare')}
        >
          So sánh sức khỏe ngân hàng
        </button>
        <button
          className={`pb-4 px-6 font-semibold transition-colors ${activeTab === 'valuation' ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]' : 'text-gray-500 hover:text-[#1E3A5F]'}`}
          onClick={() => setActiveTab('valuation')}
        >
          Định giá cổ phiếu
        </button>
      </div>

      {/* Filters Area */}
      {activeTab !== 'valuation' && (
      <div className="flex flex-wrap gap-x-8 gap-y-4 items-end mb-8 bg-white p-4 rounded-xl shadow-sm">
        
        {activeTab === 'group' && (
          <div className="flex-1 min-w-[300px]">
             <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Nhóm Ngân hàng (dành cho biểu đồ Theo dõi cơ cấu tài sản, nguồn vốn và Theo dõi cơ cấu lợi nhuận)</label>
             <select
               value={selectedGroupTab2}
               onChange={(e) => setSelectedGroupTab2(e.target.value as any)}
               className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 outline-none focus:ring-2 focus:ring-[#1E3A5F] w-full"
             >
               <option value="Tất cả">Tất cả</option>
               <option value="Nhóm quốc doanh">Nhóm quốc doanh</option>
               <option value="Nhóm chuyên cho vay DN">Nhóm chuyên cho vay DN</option>
               <option value="Nhóm chuyên cho vay cá nhân">Nhóm chuyên cho vay cá nhân</option>
               <option value="Nhóm khác">Nhóm khác</option>
             </select>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="flex-1 min-w-[300px]">
             <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Ngân hàng</label>
             <select
               value={selectedBank}
               onChange={(e) => setSelectedBank(e.target.value)}
               className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 outline-none focus:ring-2 focus:ring-[#1E3A5F] w-full"
             >
               {allBanks.map(b => <option key={b} value={b}>{b}</option>)}
             </select>
          </div>
        )}

        {activeTab === 'compare' && (
          <>
            <div className="flex-1 min-w-[300px] relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Ngân hàng</label>
              <button
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 flex justify-between items-center w-full text-left focus:ring-2 focus:ring-[#1E3A5F] outline-none"
                onClick={() => setShowCompareBankDropdown(!showCompareBankDropdown)}
              >
                <span className="truncate pr-4">
                  {compareBanks.size === Object.keys(allBanks).length ? 'Tất cả' :
                    compareBanks.size === 0 ? 'Chọn ngân hàng...' :
                    `Đã chọn ${compareBanks.size} ngân hàng`}
                </span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showCompareBankDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>

              {showCompareBankDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                    <label className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compareBanks.size === allBanks.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompareBanks(new Set(allBanks));
                          } else {
                            setCompareBanks(new Set());
                          }
                        }}
                        className="rounded text-[#1E3A5F] focus:ring-[#1E3A5F]"
                      />
                      <span className="font-medium">Tất cả ngân hàng</span>
                    </label>
                  </div>
                  <div className="p-2">
                    {allBanks.map((b) => (
                      <label key={b} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareBanks.has(b)}
                          onChange={(e) => {
                            const newSet = new Set(compareBanks);
                            if (e.target.checked) {
                              newSet.add(b);
                            } else {
                              newSet.delete(b);
                            }
                            setCompareBanks(newSet);
                          }}
                          className="rounded text-[#1E3A5F] focus:ring-[#1E3A5F]"
                        />
                        <span className="text-gray-700">{b}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-[300px]">
               <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Nhóm ngân hàng</label>
               <select
                 value={compareBankGroup}
                 onChange={(e) => {
                   setCompareBankGroup(e.target.value as any);
                 }}
                 className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 outline-none focus:ring-2 focus:ring-[#1E3A5F] w-full"
               >
                 <option value="Tất cả">Tất cả</option>
                 <option value="Nhóm quốc doanh">Nhóm Ngân hàng có vốn Nhà nước</option>
                 <option value="Nhóm chuyên cho vay DN">Nhóm chuyên cho vay DN</option>
                 <option value="Nhóm chuyên cho vay cá nhân">Nhóm chuyên cho vay cá nhân</option>
                 <option value="Nhóm khác">Nhóm khác</option>
               </select>
            </div>
          </>
        )}

        <div className="relative min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Thời gian</label>
          <button
            onClick={() => setShowQuarterDropdown(!showQuarterDropdown)}
            className="flex items-center w-full space-x-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 justify-between"
          >
            <span className="truncate">{selectedQuartersText}</span>
            <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </button>
          {showQuarterDropdown && (
            <div className="absolute top-12 left-0 w-64 bg-white border border-gray-200 shadow-lg rounded-xl z-50 p-2 max-h-80 overflow-y-auto">
              <div className="flex justify-between border-b pb-2 mb-2 px-2">
                <button 
                  className="text-sm text-[#00B4D8] hover:underline"
                  onClick={() => setSelectedQuarters(new Set(allQuarters))}
                >Chọn tất cả</button>
                <button 
                  className="text-sm text-red-500 hover:underline"
                  onClick={() => setSelectedQuarters(new Set())}
                >Bỏ chọn</button>
              </div>
              {allQuarters.map((q) => (
                <label key={q} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedQuarters.has(q)}
                    onChange={() => handleToggleQuarter(q)}
                    className="mr-3 w-4 h-4 text-[#1E3A5F] rounded border-gray-300 focus:ring-[#1E3A5F]"
                  />
                  <span className="text-gray-700">{q}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'industry' && renderTab1()}
      {activeTab === 'group' && renderGroupTab()}
      {activeTab === 'bank' && renderBankTab()}
      {activeTab === 'compare' && renderCompareTab()}
      {activeTab === 'valuation' && renderValuationTab()}

    </div>
  );
}
