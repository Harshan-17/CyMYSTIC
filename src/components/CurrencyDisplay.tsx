/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  showCode?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className = '',
  showCode = false,
}) => {
  const rounded = Math.round(Math.max(0, amount));
  const formatted = new Intl.NumberFormat('en-IN').format(rounded);

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span className="font-sans font-medium mr-0.5 select-all">₹</span>
      <span className="font-mono tabular-nums">{formatted}</span>
      {showCode && <span className="text-[10px] text-[#69788d] ml-1 font-mono">INR</span>}
    </span>
  );
};
