const K = 32;

function calculateElo(mmrA, mmrB, scoreA, scoreB) {
  const expectedA = 1 / (1 + Math.pow(10, (mmrB - mmrA) / 400));
  const expectedB = 1 - expectedA;
  const actualA = scoreA > scoreB ? 1 : 0;
  const actualB = 1 - actualA;
  const deltaA = Math.round(K * (actualA - expectedA));
  const deltaB = Math.round(K * (actualB - expectedB));
  return { deltaA, deltaB };
}

module.exports = { calculateElo, K };
