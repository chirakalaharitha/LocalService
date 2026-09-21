/**
 * Smart Priority Suggestion Engine
 * Evaluates Category, Description keywords, and Citizen urgency input.
 */
const calculateSmartPriority = ({ category, description = '', citizenUrgency = 'MEDIUM', upvoteCount = 0 }) => {
  let score = 0;

  // 1. Category Base Weight
  const categoryWeights = {
    WATER: 3,         // High baseline
    DRAINAGE: 3,      // High baseline
    ELECTRICITY: 3,   // High baseline
    ROAD: 2,          // Medium baseline
    STREET_LIGHT: 2,  // Medium baseline
    GARBAGE: 2,       // Medium baseline
    PUBLIC_AREA: 1,   // Low baseline
    OTHER: 1
  };
  score += (categoryWeights[category] || 1) * 2;

  // 2. Keyword Analysis (Safety Impact & Danger Detection)
  const lowerDesc = description.toLowerCase();
  const criticalKeywords = ['burst', 'main line', 'flooding', 'live wire', 'sparking', 'electric shock', 'cave in', 'blockage hospital', 'fire hazard', 'danger', 'collapse', 'emergency'];
  const highKeywords = ['major leak', 'no water', 'total outage', 'broken pole', 'deep pothole', 'open drain', 'overflowing', 'toxic', 'accident', 'blackout'];

  for (const kw of criticalKeywords) {
    if (lowerDesc.includes(kw)) {
      score += 5;
      break;
    }
  }

  for (const kw of highKeywords) {
    if (lowerDesc.includes(kw)) {
      score += 3;
      break;
    }
  }

  // 3. Upvotes / Community Impact boost
  if (upvoteCount >= 20) {
    score += 4;
  } else if (upvoteCount >= 10) {
    score += 2;
  } else if (upvoteCount >= 5) {
    score += 1;
  }

  // 4. Map final score to Priority level
  if (score >= 9) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
};

module.exports = { calculateSmartPriority };

