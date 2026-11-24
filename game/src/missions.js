// Missions, wanted level and police units for Solara Bay.
// Eight story missions with staged objectives, win/lose and payouts; a 0-5
// wanted state machine; six named SBPD units with roles and live distances.
export const MISSIONS = [
  { id: 'M1', name: 'FIRST LIGHT', time: '08:00', payout: 2400, wanted: 1, cash: 4120,
    objective: 'Drive to the pier checkpoint', detail: 'Follow the gold marker · 0:42 left',
    stages: ['Get in the Comet GT', 'Drive to the pier checkpoint', 'Lose the tail and park up'] },
  { id: 'M2', name: 'COLLECT THE DROP', time: '14:30', payout: 3150, wanted: 2, cash: 7270,
    objective: 'Fight through the market — grab the drop', detail: 'DROPPED 1 / 3 · FRUIT stall is the rendezvous',
    stages: ['Reach the FRUIT stall', 'Hold off the Regent crew', 'Grab the drop and run'] },
  { id: 'M3', name: 'OUTRUN THE SUNSET ROADBLOCK', time: '17:45', payout: 4800, wanted: 3, cash: 12860,
    objective: 'Escape the roadblock — jetpack over the bay', detail: '2 air units on you · fuel 82%',
    stages: ['Reach the boulevard', 'Take the jetpack', 'Outrun both helicopters'] },
  { id: 'M4', name: 'THE REGENT JOB', time: '20:15', payout: 6200, wanted: 3, cash: 15400,
    objective: 'Hit the Regent safehouse on Coral Row', detail: 'Armed guards inside · go loud or go quiet',
    stages: ['Infiltrate Coral Row', 'Crack the safe', 'Escape before the SBPD arrives'] },
  { id: 'M5', name: 'YACHT PARTY CRASH', time: '22:40', payout: 7100, wanted: 4, cash: 18900,
    objective: 'Board the big yacht — take the ledger', detail: 'Swim or steal a boat · guards on deck',
    stages: ['Reach the marina', 'Board the yacht', 'Steal the ledger and dive'] },
  { id: 'M6', name: 'WRECK THE REGENT', time: '12:00', payout: 9400, wanted: 5, cash: 18450,
    objective: 'Wreck the Regent convoy — survive the five-star heat', detail: '5 ground units + 1 air unit · hold on',
    stages: ['Ram the convoy lead car', 'Survive the five-star chase', 'Reach the safehouse garage'] },
  { id: 'M7', name: 'FERRIS WHEEL DROP', time: '16:20', payout: 5600, wanted: 2, cash: 21340,
    objective: 'Meet the contact at the top of the wheel', detail: 'No guns on the wheel · the crew is watching',
    stages: ['Ride the Ferris wheel', 'Take the package', 'Slip away through the beach'] },
  { id: 'M8', name: 'THE SOLARA HEIST', time: '23:55', payout: 15000, wanted: 5, cash: 21340,
    objective: 'Rob the Solara Hotel vault — the big one', detail: 'Tank on standby · this is the finale',
    stages: ['Enter the hotel', 'Crack the vault', 'Escape the city in the tank'] },
];

export const WEAPONS = [
  { slot: 1, name: 'PISTOL', mag: 12, reserve: 48, damage: 22, rate: 0.28 },
  { slot: 2, name: 'SMG', mag: 30, reserve: 120, damage: 14, rate: 0.09 },
  { slot: 3, name: 'SHOTGUN', mag: 6, reserve: 24, damage: 55, rate: 0.8 },
  { slot: 4, name: 'RIFLE', mag: 24, reserve: 96, damage: 34, rate: 0.14 },
  { slot: 5, name: 'SNIPER', mag: 5, reserve: 20, damage: 95, rate: 1.1 },
  { slot: 6, name: 'ROCKET LAUNCHER', mag: 1, reserve: 6, damage: 180, rate: 1.6 },
];

// Six named SBPD units: role + live distance, shown in the HUD unit list.
export const UNITS = [
  { call: 'SBPD-12', role: 'Pursuit lead', dist: 42 },
  { call: 'SBPD-07', role: 'Interceptor', dist: 58 },
  { call: 'SBPD-23', role: 'Roadblock', dist: 91 },
  { call: 'SBPD-31', role: 'Pursuit', dist: 120 },
  { call: 'SBPD-44', role: 'K-9 backup', dist: 148 },
  { call: 'AIR-1', role: 'Helicopter', dist: 210 },
];

export class Wanted {
  constructor() { this.level = 0; this.heat = 0; }
  add(n) { this.level = Math.min(5, this.level + n); this.heat = 100; }
  decay(dt) {
    if (this.level === 0) return;
    this.heat -= dt * 2.2;
    if (this.heat <= 0) { this.level = Math.max(0, this.level - 1); this.heat = this.level > 0 ? 100 : 0; }
  }
  get cops() { return [0, 1, 2, 3, 4, 5, 5][this.level]; }
  get label() { return ['CLEAN', 'HEAT 1', 'HEAT 2', 'HEAT 3', 'HEAT 4', 'FIVE-STAR HEAT'][this.level]; }
}

export class MissionRunner {
  constructor(onEvent) {
    this.onEvent = onEvent || (() => {});
    this.mission = null; this.stage = 0; this.state = 'idle'; // idle|active|complete|failed
    this.timer = 0; this.dropped = 0;
  }
  start(m) {
    this.mission = m; this.stage = 0; this.state = 'active'; this.timer = 0; this.dropped = 0;
    this.onEvent('start', m);
  }
  advance() {
    if (this.state !== 'active') return;
    this.stage++;
    if (this.stage >= this.mission.stages.length) this.complete();
    else this.onEvent('stage', this.mission.stages[this.stage]);
  }
  complete() {
    if (this.state !== 'active') return;
    this.state = 'complete';
    this.onEvent('complete', this.mission);
  }
  fail(reason) {
    if (this.state !== 'active') return;
    this.state = 'failed';
    this.onEvent('fail', reason);
  }
  update(dt) { if (this.state === 'active') this.timer += dt; }
  get objective() {
    if (!this.mission) return 'Pick a mission from the map';
    if (this.state === 'complete') return 'Mission complete — ' + this.mission.name;
    if (this.state === 'failed') return 'Mission failed — try again from the map';
    return this.mission.stages[Math.min(this.stage, this.mission.stages.length - 1)];
  }
}
