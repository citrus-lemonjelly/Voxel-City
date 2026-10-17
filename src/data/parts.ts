// Performance parts. Each league has its own T1–T5 scale (decision U3); Step 1 only uses the D league.
// Tier effects are stored as multipliers/values so one table can serve every car in the league.
// Cosmetic parts live elsewhere and never change these numbers (A24).

export type Tier = 1 | 2 | 3 | 4 | 5;
export const TIERS: Tier[] = [1, 2, 3, 4, 5];

export interface EngineTier { tier: Tier; hpMult: number; redlineAdd: number; price: number; label: string }
export interface TransmissionTier {
  tier: Tier;
  ratios: number[];        // gear ratios; more gears = more shifts (R5)
  shiftTime: number;       // seconds with no drive while changing gear
  zoneCentre: number;      // shift-zone centre as a fraction of redline
  zoneWidth: number;       // shift-zone width as a fraction of redline (tighter at higher tiers)
  perfectBoost: number;    // brief torque bonus after a Perfect shift (higher payoff at higher tiers)
  price: number;
  label: string;
}

export const ENGINE: Record<'D', EngineTier[]> = {
  D: [
    { tier: 1, hpMult: 1.00, redlineAdd: 0,   price: 0,    label: 'Stock' },
    { tier: 2, hpMult: 1.08, redlineAdd: 100, price: 600,  label: 'Intake + exhaust' },
    { tier: 3, hpMult: 1.16, redlineAdd: 200, price: 1200, label: 'Cams + tune' },
    { tier: 4, hpMult: 1.25, redlineAdd: 300, price: 2200, label: 'Ported head' },
    { tier: 5, hpMult: 1.35, redlineAdd: 400, price: 3600, label: 'Built motor' },
  ],
};

export const TRANSMISSION: Record<'D', TransmissionTier[]> = {
  D: [
    { tier: 1, ratios: [3.25, 1.90, 1.30, 1.00, 0.80],        shiftTime: 0.50, zoneCentre: 0.90, zoneWidth: 0.10, perfectBoost: 0.05, price: 0,    label: 'Stock 5-speed' },
    { tier: 2, ratios: [3.25, 1.95, 1.36, 1.05, 0.84],        shiftTime: 0.42, zoneCentre: 0.90, zoneWidth: 0.09, perfectBoost: 0.07, price: 700,  label: 'Short shifter' },
    { tier: 3, ratios: [3.25, 2.20, 1.62, 1.26, 1.02, 0.84],  shiftTime: 0.34, zoneCentre: 0.91, zoneWidth: 0.08, perfectBoost: 0.09, price: 1400, label: 'Close-ratio 6-speed' },
    { tier: 4, ratios: [3.30, 2.25, 1.68, 1.32, 1.07, 0.88],  shiftTime: 0.26, zoneCentre: 0.91, zoneWidth: 0.07, perfectBoost: 0.11, price: 2500, label: 'Sport 6-speed' },
    { tier: 5, ratios: [3.35, 2.32, 1.74, 1.38, 1.12, 0.92],  shiftTime: 0.18, zoneCentre: 0.92, zoneWidth: 0.06, perfectBoost: 0.13, price: 3900, label: 'Sequential 6-speed' },
  ],
};

// Launch window (hold to rev, release on green): RPM at release as a fraction of redline (R9).
export const LAUNCH = { perfectMin: 0.55, perfectMax: 0.72, goodPad: 0.10, bogPenalty: 0.55, spinSeconds: 0.7, spinGrip: 0.55 };
