import {
  getAngle,
  getDistance,
  getMidpoint,
  getNormalizedTorsoSize,
  isLandmarkVisible,
} from '../poseMath';

const REQUIRED_INDEXES = [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function toUnitRange(value, minimum, maximum) {
  if (maximum === minimum) {
    return 0;
  }

  return clamp((value - minimum) / (maximum - minimum), 0, 1);
}

function evaluateSide(landmarks, supportSide, torsoSize) {
  const supportHip = supportSide === 'left' ? landmarks[23] : landmarks[24];
  const supportKnee = supportSide === 'left' ? landmarks[25] : landmarks[26];
  const supportAnkle = supportSide === 'left' ? landmarks[27] : landmarks[28];
  const liftedHip = supportSide === 'left' ? landmarks[24] : landmarks[23];
  const liftedKnee = supportSide === 'left' ? landmarks[26] : landmarks[25];
  const liftedAnkle = supportSide === 'left' ? landmarks[28] : landmarks[27];

  const supportLegAngle = getAngle(supportHip, supportKnee, supportAnkle);
  const bentLegAngle = getAngle(liftedHip, liftedKnee, liftedAnkle);
  const footLiftHeight = (supportAnkle.y - liftedAnkle.y) / torsoSize;
  const inwardFootDistance = Math.abs(liftedAnkle.x - supportHip.x) / torsoSize;
  const liftedKneeDistance = Math.abs(liftedKnee.x - supportHip.x) / torsoSize;
  const footToSupportKnee = getDistance(liftedAnkle, supportKnee) / torsoSize;
  const footToSupportHip = getDistance(liftedAnkle, supportHip) / torsoSize;

  const standingLegScore = toUnitRange(supportLegAngle, 158, 178);
  const bentLegScore = 1 - toUnitRange(bentLegAngle, 128, 172);
  const footLiftScore = toUnitRange(footLiftHeight, 0.1, 0.55);
  const inwardPlacementScore = 1 - toUnitRange(inwardFootDistance, 0.1, 0.7);
  const kneeOpenScore = toUnitRange(liftedKneeDistance, 0.12, 0.45);
  const footPlacementHeightScore =
    1 - clamp(Math.min(footToSupportKnee, footToSupportHip) / 1.2, 0, 1);

  // Tree Pose should look like one stable leg and one clearly bent lifted leg.
  const structuralScore =
    standingLegScore * 0.3 +
    bentLegScore * 0.28 +
    footLiftScore * 0.2 +
    inwardPlacementScore * 0.12 +
    kneeOpenScore * 0.06 +
    footPlacementHeightScore * 0.04;

  return {
    supportSide,
    supportLegAngle,
    bentLegAngle,
    footLiftHeight,
    inwardFootDistance,
    liftedKneeDistance,
    footToSupportKnee,
    footToSupportHip,
    standingLegScore,
    bentLegScore,
    footLiftScore,
    inwardPlacementScore,
    structuralScore,
  };
}

export function evaluateTreePose(landmarks) {
  const hasAllKeyPoints = REQUIRED_INDEXES.every((index) => isLandmarkVisible(landmarks[index], 0.45));

  if (!hasAllKeyPoints) {
    return {
      score: 0,
      feedbackMessages: ['Stand fully in front of the camera'],
      debug: {},
    };
  }

  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const torsoSize = getNormalizedTorsoSize(landmarks);
  const shoulderCenter = getMidpoint(leftShoulder, rightShoulder);
  const hipCenter = getMidpoint(leftHip, rightHip);
  const leftCandidate = evaluateSide(landmarks, 'left', torsoSize);
  const rightCandidate = evaluateSide(landmarks, 'right', torsoSize);
  const activeCandidate =
    leftCandidate.structuralScore >= rightCandidate.structuralScore ? leftCandidate : rightCandidate;

  const bothLegsStraight =
    leftCandidate.supportLegAngle > 164 &&
    rightCandidate.supportLegAngle > 164 &&
    leftCandidate.bentLegAngle > 150 &&
    rightCandidate.bentLegAngle > 150;
  const bothFeetLow = Math.abs(leftAnkle.y - rightAnkle.y) / torsoSize < 0.12;
  const noClearlyLiftedLeg = activeCandidate.footLiftHeight < 0.12 || activeCandidate.bentLegAngle > 148;
  const noInwardPlacement = activeCandidate.inwardFootDistance > 0.48;
  const isProbablyJustStanding =
    bothLegsStraight && bothFeetLow && noClearlyLiftedLeg && noInwardPlacement;

  const uprightOffset =
    (Math.abs(shoulderCenter.x - hipCenter.x) + Math.abs(nose.x - hipCenter.x)) / 2 / torsoSize;
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / torsoSize;
  const hipTilt = Math.abs(leftHip.y - rightHip.y) / torsoSize;
  const wristsAboveShoulders =
    leftWrist.y < leftShoulder.y - torsoSize * 0.03 && rightWrist.y < rightShoulder.y - torsoSize * 0.03;
  const armsUp = wristsAboveShoulders;

  const torsoScore =
    (1 - clamp(uprightOffset / 0.18, 0, 1)) * 0.55 +
    (1 - clamp(shoulderTilt / 0.12, 0, 1)) * 0.25 +
    (1 - clamp(hipTilt / 0.12, 0, 1)) * 0.2;

  let score = activeCandidate.structuralScore * 78 + torsoScore * 22 + (armsUp ? 6 : 0);

  // If the body still looks too much like Mountain Pose, keep the Tree score low.
  if (isProbablyJustStanding) {
    score = Math.min(score, 24);
  }

  if (activeCandidate.bentLegScore < 0.35 || activeCandidate.footLiftScore < 0.28) {
    score = Math.min(score, 42);
  }

  if (activeCandidate.inwardPlacementScore < 0.22) {
    score = Math.min(score, 52);
  }

  score = clamp(Math.round(score), 0, 100);

  const feedbackMessages = [];

  if (isProbablyJustStanding) {
    feedbackMessages.push('Lift one foot higher on the standing leg');
    feedbackMessages.push('Bend the lifted leg more');
  } else {
    if (activeCandidate.footLiftHeight < 0.18 || activeCandidate.inwardPlacementScore < 0.35) {
      feedbackMessages.push('Lift one foot higher on the standing leg');
    }

    if (activeCandidate.bentLegAngle > 140) {
      feedbackMessages.push('Bend the lifted leg more');
    }

    if (activeCandidate.standingLegScore < 0.45) {
      feedbackMessages.push('Keep one leg straight and stable');
    }
  }

  if (uprightOffset > 0.13 || shoulderTilt > 0.08 || hipTilt > 0.08) {
    feedbackMessages.push('Stand upright and find your balance');
  }

  if (!armsUp) {
    feedbackMessages.push('Raise your arms for a more complete Tree Pose');
  }

  if (score >= 84 && !isProbablyJustStanding) {
    feedbackMessages.unshift('Nice balance, hold your Tree Pose steady');
  }

  return {
    score,
    feedbackMessages: feedbackMessages.slice(0, 4),
    debug: {
      detectedSide: activeCandidate.supportSide,
      standingLegAngle: Number(activeCandidate.supportLegAngle.toFixed(1)),
      bentLegAngle: Number(activeCandidate.bentLegAngle.toFixed(1)),
      footLiftHeight: Number(activeCandidate.footLiftHeight.toFixed(2)),
      inwardFootDistance: Number(activeCandidate.inwardFootDistance.toFixed(2)),
      armsUp,
      isProbablyJustStanding,
      torsoUprightOffset: Number(uprightOffset.toFixed(2)),
      shoulderTilt: Number(shoulderTilt.toFixed(2)),
      hipTilt: Number(hipTilt.toFixed(2)),
      structuralScore: Number(activeCandidate.structuralScore.toFixed(2)),
    },
  };
}
