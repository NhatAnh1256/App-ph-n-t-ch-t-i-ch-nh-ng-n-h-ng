import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart as RechartsAreaChart,
  Area,
  ComposedChart as RechartsComposedChart,
  Line,
} from 'recharts';

interface ChartProps {
  data: any[];
  xKey: string;
  series: { key: string; name: string; color: string; type?: 'bar' | 'line' | 'area'; stackId?: string }[];
  height?: number;
  stacked?: boolean;
  isPercent?: boolean;
  is100Percent?: boolean;
  valueFormatter?: (value: number) => string;
}

const defaultFormatter = (val: number) => val.toLocaleString();

const customTooltipFormatter = (value: number, name: string, isPercent: boolean, is100Percent: boolean, valueFormatter?: (v: number) => string) => {
  if (is100Percent) {
    return [(value * 100).toFixed(1) + '%', name];
  }
  if (isPercent) {
    return [value.toFixed(2) + '%', name];
  }
  if (valueFormatter) {
    return [valueFormatter(value), name];
  }
  return [defaultFormatter(value), name];
};

const CustomTooltip = ({ active, payload, label, is100Percent, isPercent, valueFormatter, series, activeSegment }: any) => {
  if (active && payload && payload.length) {
    let tooltipPayload = activeSegment ? payload.filter((p: any) => p.dataKey === activeSegment) : payload;
    if (tooltipPayload.length === 0) tooltipPayload = payload;

    if (is100Percent) {
      const dataRow = payload[0].payload;
      
      let total = 0;
      series.forEach((s: any) => {
        total += Math.abs(Number(dataRow[s.key] || 0));
      });
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-sm cursor-default z-50">
          <p className="font-semibold text-gray-700 mb-2">{label}</p>
          <div className="space-y-1">
            {tooltipPayload.map((item: any, idx: number) => {
              const rawValue = Number(item.payload[item.dataKey] || item.value || 0);
              const valueInBillions = rawValue / 1000000000;
              const percentStr = total > 0 ? (rawValue / total * 100).toFixed(1) : '0.0';
              const valueFormatted = valueInBillions.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
              
              return (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="text-gray-600 max-w-[200px] truncate" title={item.name}>{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900 whitespace-nowrap">
                    {valueFormatted} tỷ ({percentStr}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-sm cursor-default z-50">
        <p className="font-semibold text-gray-700 mb-2">{label}</p>
        <div className="space-y-1">
          {tooltipPayload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-600 max-w-[200px] truncate" title={item.name}>{item.name}</span>
              </div>
              <span className="font-medium text-gray-900 whitespace-nowrap">
                {customTooltipFormatter(item.value, item.name, isPercent || false, false, valueFormatter)[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const MixedChart: React.FC<ChartProps> = ({ data, xKey, series, height = 280, stacked, isPercent, is100Percent, valueFormatter }) => {
  const stackOffset = is100Percent ? 'expand' : 'none';
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  
  const handleLegendClick = (e: any) => {
    const key = e.dataKey;
    setHiddenSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const visibleSeries = series.filter(s => !hiddenSeries.has(s.key));
  
  const allBars = series.every(s => s.type === 'bar' || !s.type);

  if (allBars) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} stackOffset={stackOffset} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#6B7280' }} tickMargin={10} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(tick) => {
              if (is100Percent) return `${(tick * 100).toFixed(0)}%`;
              if (isPercent) return `${tick}%`;
              return (tick / 1000).toLocaleString();
            }}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            shared={!stacked}
            content={<CustomTooltip is100Percent={is100Percent} isPercent={isPercent} valueFormatter={valueFormatter} series={visibleSeries} activeSegment={activeSegment} />}
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} onClick={handleLegendClick} />
          {visibleSeries.map((s, idx) => (
            <Bar 
              key={idx} 
              dataKey={s.key} 
              name={s.name} 
              fill={s.color} 
              stackId={stacked ? "stack" : s.stackId} 
              radius={stacked ? 0 : [4, 4, 0, 0]} 
              onMouseEnter={() => setActiveSegment(s.key)}
              onMouseLeave={() => setActiveSegment(null)}
              onClick={() => setActiveSegment(activeSegment === s.key ? null : s.key)}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsComposedChart data={data} stackOffset={stackOffset} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#6B7280' }} tickMargin={10} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(tick) => {
            if (is100Percent) return `${(tick * 100).toFixed(0)}%`;
            if (isPercent) return `${tick}%`;
            return (tick / 1000).toLocaleString(); // Default scaling for big numbers just for axis readability
          }}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          shared={!stacked}
          content={<CustomTooltip is100Percent={is100Percent} isPercent={isPercent} valueFormatter={valueFormatter} series={visibleSeries} activeSegment={activeSegment} />}
          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} onClick={handleLegendClick} />
        {visibleSeries.map((s, idx) => {
                   if (s.type === 'line') {
                     return <Line 
                              key={idx} 
                              type="monotone" 
                              dataKey={s.key} 
                              name={s.name} 
                              stroke={s.color} 
                              strokeWidth={2} 
                              dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: s.color }}
                              activeDot={{ r: 6, fill: s.color, stroke: '#fff', strokeWidth: 2 }}
                              strokeDasharray={(s as any).strokeDasharray}
                              onMouseEnter={() => setActiveSegment(s.key)}
                              onMouseLeave={() => setActiveSegment(null)}
                              onClick={() => setActiveSegment(activeSegment === s.key ? null : s.key)}
                            />;
                   }
          if (s.type === 'area') {
             return <Area 
                      key={idx} 
                      type="monotone" 
                      dataKey={s.key} 
                      name={s.name} 
                      fill={s.color} 
                      stroke={s.color} 
                      stackId={stacked ? "stack" : s.stackId} 
                      fillOpacity={0.6} 
                      onMouseEnter={() => setActiveSegment(s.key)}
                      onMouseLeave={() => setActiveSegment(null)}
                      onClick={() => setActiveSegment(activeSegment === s.key ? null : s.key)}
                    />;
          }
          return (
            <Bar 
              key={idx} 
              dataKey={s.key} 
              name={s.name} 
              fill={s.color} 
              stackId={stacked ? "stack" : s.stackId} 
              radius={stacked ? 0 : [4, 4, 0, 0]} 
              onMouseEnter={() => setActiveSegment(s.key)}
              onMouseLeave={() => setActiveSegment(null)}
              onClick={() => setActiveSegment(activeSegment === s.key ? null : s.key)}
            />
          );
        })}
      </RechartsComposedChart>
    </ResponsiveContainer>
  );
};

