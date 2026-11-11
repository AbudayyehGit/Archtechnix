import React from 'react';
import { Check, Sliders, CreditCard, Webhook, ArrowRight } from 'lucide-react';
import { PRICING_TIERS, SCOPE_ADDONS } from '../data';
import { PricingTier } from '../types';

interface PricingCalculatorProps {
  selectedTier: string;
  onSelectTier: (tierId: 'diagnostic' | 'audit' | 'retainer') => void;
  selectedAddons: {
    expedite: boolean;
    terraform: boolean;
    drDrill: boolean;
  };
  onToggleAddon: (addonId: 'expedite' | 'terraform' | 'drDrill') => void;
  onSimulateStripe: () => void;
  onSimulateWebhook: () => void;
  onScrollToIntake: () => void;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  selectedTier,
  onSelectTier,
  selectedAddons,
  onToggleAddon,
  onSimulateStripe,
  onSimulateWebhook,
  onScrollToIntake
}) => {
  const currentTier = PRICING_TIERS.find((t) => t.id === selectedTier) || PRICING_TIERS[1];

  let totalPrice = currentTier.price;
  if (selectedAddons.expedite) totalPrice += 1200;
  if (selectedAddons.terraform) totalPrice += 1800;
  if (selectedAddons.drDrill) totalPrice += 2200;

  return (
    <div className="space-y-8">
      {/* Strategic Capacity Constraint Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold shrink-0">
            {'{∞}'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Operational Capacity Constraint
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active Slot Status: 2 / 4 Filled
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly capped at 4 monthly retainer clients to guarantee a focused 20–25 hour advisory work week.
            </p>
          </div>
        </div>

        {/* Financial Range Pill */}
        <div className="flex items-center space-x-3 text-xs font-mono bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 self-stretch sm:self-auto justify-between sm:justify-start">
          <span className="text-slate-500">Revenue Band:</span>
          <span className="text-slate-400">$0 <span className="text-slate-600">→</span></span>
          <span className="text-cyan-400 font-bold">$15,000 <span className="text-slate-500 text-[10px]">(Mid)</span> <span className="text-slate-600">→</span></span>
          <span className="text-orange-400 font-bold">$30,000/mo <span className="text-slate-500 text-[10px]">(Max)</span></span>
        </div>
      </div>

      {/* 3 Tier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PRICING_TIERS.map((tier) => {
          const isSelected = tier.id === selectedTier;
          return (
            <div
              key={tier.id}
              onClick={() => onSelectTier(tier.id)}
              className={`cursor-pointer rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 border-2 relative ${
                isSelected
                  ? 'border-orange-500 bg-slate-900 shadow-xl shadow-orange-500/10'
                  : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 right-6 bg-orange-500 text-white text-[10px] font-mono font-bold uppercase px-3 py-0.5 rounded-full shadow-sm">
                  {tier.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                    {tier.turnaround}
                  </span>
                  <div className="text-2xl font-black text-white tabular-nums">
                    ${tier.price.toLocaleString()}
                    {tier.period && <span className="text-xs font-normal text-slate-400">{tier.period}</span>}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mt-4">{tier.name}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{tier.description}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className={`mt-8 w-full py-2.5 rounded-lg text-xs font-bold font-mono transition-colors ${
                  isSelected
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {isSelected ? `Configured (${tier.name})` : `Select ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Scope Add-ons & Dynamic Total Bar */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase text-slate-400 mb-4">
          <Sliders className="w-4 h-4 text-orange-500" />
          <span>Scope Multipliers & Add-On Accelerators</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SCOPE_ADDONS.map((addon) => {
            const isChecked = selectedAddons[addon.id];
            return (
              <label
                key={addon.id}
                className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-slate-950 border-orange-500/60 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleAddon(addon.id)}
                  className="mt-0.5 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-semibold text-white">
                    {addon.label} <span className="text-orange-400 tabular-nums">(+${addon.price.toLocaleString()})</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{addon.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <div className="text-xs text-slate-400 font-mono">Calculated Investment:</div>
            <div className="text-3xl font-black text-orange-500 tabular-nums">
              ${totalPrice.toLocaleString()}
              {currentTier.period && <span className="text-sm font-normal text-slate-400">{currentTier.period}</span>}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Selected: {currentTier.name}
              {selectedAddons.expedite ? ' + 24hr Expedite' : ''}
              {selectedAddons.terraform ? ' + Terraform' : ''}
              {selectedAddons.drDrill ? ' + DR Drill' : ''}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onScrollToIntake}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-3 rounded-lg text-xs font-mono flex items-center space-x-2 transition-all"
            >
              <span>Fill Schedule A Spec</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onSimulateStripe}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-lg text-xs font-bold font-mono flex items-center space-x-2 transition-all shadow-lg"
            >
              <CreditCard className="w-4 h-4" />
              <span>Simulate Stripe Checkout</span>
            </button>
            <button
              onClick={onSimulateWebhook}
              className="bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 px-4 py-3 rounded-lg text-xs font-mono flex items-center space-x-2 transition-all"
            >
              <Webhook className="w-4 h-4" />
              <span>Dispatch Webhook</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
