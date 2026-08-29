const { describe, it } = require('node:test');
const assert = require('node:assert');
const { calculateElo, calculateTeamElo, K } = require('../elo');

describe('Elo Engine Tests', () => {
  describe('1v1 calculateElo', () => {
    it('calculates symmetrical delta when MMR is equal', () => {
      const { deltaA, deltaB } = calculateElo(1200, 1200, 11, 8);
      assert.strictEqual(deltaA, 16);
      assert.strictEqual(deltaB, -16);
    });

    it('gives smaller delta when higher MMR player wins (expected outcome)', () => {
      const { deltaA, deltaB } = calculateElo(1400, 1000, 11, 4);
      assert.strictEqual(deltaA, 3);
      assert.strictEqual(deltaB, -3);
    });

    it('gives larger delta on upset victory (lower MMR wins)', () => {
      const { deltaA, deltaB } = calculateElo(1000, 1400, 11, 9);
      assert.strictEqual(deltaA, 29);
      assert.strictEqual(deltaB, -29);
    });
  });

  describe('2v2 calculateTeamElo', () => {
    it('calculates average MMR and symmetrical deltas for balanced teams', () => {
      // Team A: [1300, 1100] -> avg 1200
      // Team B: [1200, 1200] -> avg 1200
      const result = calculateTeamElo([1300, 1100], [1200, 1200], 11, 9);
      assert.strictEqual(result.teamAvgA, 1200);
      assert.strictEqual(result.teamAvgB, 1200);
      assert.strictEqual(result.deltaA, 16);
      assert.strictEqual(result.deltaB, -16);
    });

    it('handles unbalanced team averages correctly with upset dynamics', () => {
      // Team A: [1500, 1500] -> avg 1500
      // Team B: [1100, 1100] -> avg 1100
      // Team B pulls off an upset
      const result = calculateTeamElo([1500, 1500], [1100, 1100], 9, 11);
      assert.strictEqual(result.teamAvgA, 1500);
      assert.strictEqual(result.teamAvgB, 1100);
      assert.strictEqual(result.deltaA, -29);
      assert.strictEqual(result.deltaB, 29);
    });

    it('handles scalar numbers as team averages', () => {
      const result = calculateTeamElo(1250, 1150, 11, 5);
      assert.strictEqual(result.teamAvgA, 1250);
      assert.strictEqual(result.teamAvgB, 1150);
      assert(result.deltaA > 0);
      assert(result.deltaB < 0);
      assert.strictEqual(result.deltaA + result.deltaB, 0);
    });
  });
});
