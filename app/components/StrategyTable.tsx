"use client";

interface Strategy {
  name: string;
  pt: number;
  pro: number;
  sr: number;
  card: number;
  ae: number;
  total: number;
}

interface StrategyTableProps {
  strategies: Strategy[];
}

export default function StrategyTable({ strategies }: StrategyTableProps) {
  return (
    <div className="bg-bg-panel border border-border rounded-xl overflow-hidden h-full">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
          Strategy Performance
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-mono">
            {strategies.length} strategies
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-mono text-accent-orange uppercase tracking-wider">
                Strategy
              </th>
              <th className="text-center px-3 py-3 text-xs font-mono text-accent-orange uppercase tracking-wider">
                PT
              </th>
              <th className="text-center px-3 py-3 text-xs font-mono text-accent-orange uppercase tracking-wider">
                PRO
              </th>
              <th className="text-center px-3 py-3 text-xs font-mono text-accent-orange uppercase tracking-wider">
                SR
              </th>
              <th className="text-center px-3 py-3 text-xs font-mono text-accent-orange uppercase tracking-wider">
                CARD
              </th>
              <th className="text-center px-3 py-3 text-xs font-mono text-accent-orange uppercase tracking-wider">
                AE
              </th>
              <th className="text-center px-4 py-3 text-xs font-mono text-accent-orange uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {strategies.map((strategy, index) => (
              <tr
                key={index}
                className="border-b border-border/50 hover:bg-bg-secondary/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-mono text-text-primary">
                  {strategy.name}
                </td>
                <td className="px-3 py-3 text-sm font-mono text-text-secondary text-center">
                  {strategy.pt}
                </td>
                <td className="px-3 py-3 text-sm font-mono text-text-secondary text-center">
                  {strategy.pro}%
                </td>
                <td className="px-3 py-3 text-sm font-mono text-text-secondary text-center">
                  {strategy.sr}
                </td>
                <td className="px-3 py-3 text-sm font-mono text-text-secondary text-center">
                  {strategy.card}%
                </td>
                <td className="px-3 py-3 text-sm font-mono text-text-secondary text-center">
                  {strategy.ae}%
                </td>
                <td className="px-4 py-3 text-sm font-mono text-center">
                  <span className={
                    strategy.total >= 70 
                      ? "text-accent-green" 
                      : strategy.total >= 50 
                        ? "text-accent-yellow" 
                        : "text-accent-red"
                  }>
                    {strategy.total}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-text-muted font-mono">
          Last updated: just now
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono">
            <span className="text-accent-green">●</span> Good
          </span>
          <span className="text-xs font-mono">
            <span className="text-accent-yellow">●</span> Moderate
          </span>
          <span className="text-xs font-mono">
            <span className="text-accent-red">●</span> Poor
          </span>
        </div>
      </div>
    </div>
  );
}
