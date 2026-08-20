// Manual mock for recharts
const React_recharts = require('react');

module.exports = {
  ResponsiveContainer: ({ children, width, height }: any) =>
    React_recharts.createElement('div', {
      'data-testid': 'recharts-container',
      style: { width: width || '100%', height: height || 300 },
    }, children),
  BarChart: ({ children }: any) => React_recharts.createElement('div', { 'data-testid': 'recharts-barchart' }, children),
  AreaChart: ({ children }: any) => React_recharts.createElement('div', { 'data-testid': 'recharts-areachart' }, children),
  PieChart: ({ children }: any) => React_recharts.createElement('div', { 'data-testid': 'recharts-piechart' }, children),
  Bar: () => React_recharts.createElement('div', { 'data-testid': 'recharts-bar' }),
  Area: () => React_recharts.createElement('div', { 'data-testid': 'recharts-area' }),
  Pie: ({ children }: any) => React_recharts.createElement('div', { 'data-testid': 'recharts-pie' }, children),
  Cell: () => React_recharts.createElement('div', { 'data-testid': 'recharts-cell' }),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
};
