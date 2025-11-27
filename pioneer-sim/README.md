Pioneer Pathways: PoH Simulation

This small simulation compares several Proof of Humanity approaches (Proof of Humanity, Worldcoin, BrightID, Idena) versus the Pioneer Pathways continuous-agent design.

Run:

```powershell
# from project root
node pioneer-sim\sim.js
```

What it does:

- Simulates a population of agents (humans vs bots) across epochs.
- Applies heuristic acceptance probabilities for each project and computes precision, recall, FPR, FNR, cost and privacy estimate.
- Prints a short comparative summary and deltas showing where Pioneer Pathways improves on others.

Notes:

- This is a low-fidelity, parameterized prototype for exploration and tuning. Use it to iterate on thresholds and costs.
- To change population/epochs, edit `sim.js` variables near the bottom.
