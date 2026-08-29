const K = 32;

/**
 * Calculates Elo delta for 1v1 singles matches.
 *
 * @param {number} mmrA - Player A MMR
 * @param {number} mmrB - Player B MMR
 * @param {number} scoreA - Player A score
 * @param {number} scoreB - Player B score
 * @returns {{ deltaA: number, deltaB: number, expectedA: number, expectedB: number }}
 */
function calculateElo(mmrA, mmrB, scoreA, scoreB) {
  const effectiveA = Array.isArray(mmrA) ? (Number(mmrA[0]) + Number(mmrA[1])) / 2 : Number(mmrA);
  const effectiveB = Array.isArray(mmrB) ? (Number(mmrB[0]) + Number(mmrB[1])) / 2 : Number(mmrB);
  const expectedA = 1 / (1 + Math.pow(10, (effectiveB - effectiveA) / 400));
  const expectedB = 1 - expectedA;
  const actualA = Number(scoreA) > Number(scoreB) ? 1 : 0;
  const actualB = 1 - actualA;
  const deltaA = Math.round(K * (actualA - expectedA));
  const deltaB = Math.round(K * (actualB - expectedB));
  return { deltaA, deltaB, expectedA, expectedB };
}

/**
 * Calculates Elo delta for 2v2 doubles matches.
 * Computes average MMR for each team to determine win expectations,
 * then applies the resulting deltas across all 4 participants.
 *
 * @param {number|number[]} teamA - Either Team A average MMR or array of [mmrA1, mmrA2]
 * @param {number|number[]} teamB - Either Team B average MMR or array of [mmrB1, mmrB2]
 * @param {number} scoreA - Team A score
 * @param {number} scoreB - Team B score
 * @returns {{ deltaA: number, deltaB: number, teamAvgA: number, teamAvgB: number, expectedA: number, expectedB: number }}
 */
function calculateTeamElo(teamA, teamB, scoreA, scoreB) {
  const teamAvgA = Array.isArray(teamA)
    ? Math.round((Number(teamA[0]) + Number(teamA[1])) / 2)
    : Math.round(Number(teamA));
  const teamAvgB = Array.isArray(teamB)
    ? Math.round((Number(teamB[0]) + Number(teamB[1])) / 2)
    : Math.round(Number(teamB));

  const { deltaA, deltaB, expectedA, expectedB } = calculateElo(teamAvgA, teamAvgB, scoreA, scoreB);
  return {
    deltaA,
    deltaB,
    teamAvgA,
    teamAvgB,
    expectedA,
    expectedB,
  };
}

module.exports = { calculateElo, calculateTeamElo, K };
