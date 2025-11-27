// Simple simulator comparing PoH approaches vs Pioneer Pathways
// Run: node sim.js

function rand() {
  return Math.random();
}

const projects = [
  {
    id: 'poh_eth',
    name: 'Proof of Humanity (Ethereum)',
    human_accept_prob: 0.98,
    bot_accept_prob: 0.4,
    cost_per_check: 5.0,
    privacy_risk: 0.7,
    notes: 'Video + social attestations; good detection but poor scaling & privacy.',
  },
  {
    id: 'worldcoin',
    name: 'Worldcoin',
    human_accept_prob: 0.995,
    bot_accept_prob: 0.2,
    cost_per_check: 8.0,
    privacy_risk: 0.95,
    notes: 'Biometric (orb); high accuracy but high privacy risk & centralization.',
  },
  {
    id: 'brightid',
    name: 'BrightID',
    human_accept_prob: 0.9,
    bot_accept_prob: 0.6,
    cost_per_check: 1.0,
    privacy_risk: 0.2,
    notes: 'Social graph; reasonable privacy but weaker against sophisticated Sybil.',
  },
  {
    id: 'idena',
    name: 'Idena',
    human_accept_prob: 0.92,
    bot_accept_prob: 0.3,
    cost_per_check: 2.0,
    privacy_risk: 0.4,
    notes: 'Synchronous tests; strong but UX heavy and timing-dependent.',
  },
  {
    id: 'pioneer',
    name: 'Pioneer Pathways (continuous agent)',
    human_accept_prob: 0.99,
    bot_accept_prob: 0.25,
    cost_per_check: 0.8,
    privacy_risk: 0.15,
    notes:
      'Continuous off-chain agent + periodic attestations; aims for low friction and sustained signal.',
  },
];

function simulate(project, populations, epochs) {
  // populations: {humans: n, bots: m}
  let stats = {
    humans: { accepted: 0, rejected: 0 },
    bots: { accepted: 0, rejected: 0 },
    total_cost: 0,
  };

  for (let e = 0; e < epochs; e++) {
    // each epoch, run checks on all agents
    for (let i = 0; i < populations.humans; i++) {
      const p = project.human_accept_prob;
      if (rand() < p) stats.humans.accepted++;
      else stats.humans.rejected++;
      stats.total_cost += project.cost_per_check;
    }
    for (let i = 0; i < populations.bots; i++) {
      const p = project.bot_accept_prob;
      if (rand() < p) stats.bots.accepted++;
      else stats.bots.rejected++;
      stats.total_cost += project.cost_per_check;
    }
  }
  return stats;
}

function summarize(project, stats, populations, epochs) {
  const humans_total = populations.humans * epochs;
  const bots_total = populations.bots * epochs;

  const true_positive = stats.humans.accepted; // human accepted
  const false_negative = stats.humans.rejected; // human rejected
  const false_positive = stats.bots.accepted; // bot accepted as human
  const true_negative = stats.bots.rejected;

  const precision = true_positive / (true_positive + false_positive) || 0;
  const recall = true_positive / (true_positive + false_negative) || 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    id: project.id,
    name: project.name,
    precision: precision,
    recall: recall,
    f1: f1,
    false_positive_rate: false_positive / bots_total,
    false_negative_rate: false_negative / humans_total,
    avg_cost_per_agent_per_epoch:
      stats.total_cost / ((populations.humans + populations.bots) * epochs),
    privacy_risk: project.privacy_risk,
    notes: project.notes,
  };
}

function runAll(populationSize, botFraction, epochs) {
  const humans = Math.round(populationSize * (1 - botFraction));
  const bots = populationSize - humans;
  const populations = { humans, bots };

  const results = [];
  for (const p of projects) {
    const stats = simulate(p, populations, epochs);
    const sum = summarize(p, stats, populations, epochs);
    results.push(sum);
  }
  return { populations, epochs, results };
}

function printComparison(res) {
  console.log('\nSimulation parameters:');
  console.log(` - Humans: ${res.populations.humans}`);
  console.log(` - Bots: ${res.populations.bots}`);
  console.log(` - Epochs: ${res.epochs}`);

  console.log('\nResults (precision / recall / f1 / FPR / FNR / cost / privacy):');
  for (const r of res.results) {
    console.log(`\n${r.name}`);
    console.log(
      `  precision: ${(r.precision * 100).toFixed(2)}%  recall: ${(r.recall * 100).toFixed(2)}%  f1: ${(r.f1 * 100).toFixed(2)}%`
    );
    console.log(
      `  FPR: ${(r.false_positive_rate * 100).toFixed(2)}%  FNR: ${(r.false_negative_rate * 100).toFixed(2)}%`
    );
    console.log(
      `  avg cost/agent/epoch: ${r.avg_cost_per_agent_per_epoch.toFixed(2)}  privacy_risk(0-1): ${r.privacy_risk}`
    );
    console.log(`  notes: ${r.notes}`);
  }

  // quick delta showing where Pioneer wins
  const pioneer = res.results.find((x) => x.id === 'pioneer');
  console.log('\nDelta: Pioneer vs others (lower FPR/FNR and cost/ privacy preferable)');
  for (const r of res.results) {
    if (r.id === 'pioneer') continue;
    const fpr_delta = r.false_positive_rate - pioneer.false_positive_rate;
    const fnr_delta = r.false_negative_rate - pioneer.false_negative_rate;
    const cost_delta = r.avg_cost_per_agent_per_epoch - pioneer.avg_cost_per_agent_per_epoch;
    const priv_delta = r.privacy_risk - pioneer.privacy_risk;
    console.log(
      `\n${r.name} -> FPR delta: ${(fpr_delta * 100).toFixed(2)}%, FNR delta: ${(fnr_delta * 100).toFixed(2)}%, cost delta: ${cost_delta.toFixed(2)}, privacy delta: ${priv_delta.toFixed(2)}`
    );
  }
}

// default run
const populationSize = 10000;
const botFraction = 0.1; // 10% bots
const epochs = 7; // simulate a week of checks

const res = runAll(populationSize, botFraction, epochs);
printComparison(res);

console.log('\nSimulation complete.');
