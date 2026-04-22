import {
  getAngle,
  getDistance,
  getMidpoint,
  getNormalizedTorsoSize,
  isLandmarkVisible,
} from '../poseMath';

const REQUIRED_INDEXES = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

function clampPenalty(value, maximumPenalty) {
  return Math.max(0, Math.min(maximumPenalty, value));
}

function getFootPlacementScore(liftedFoot, supportKnee, supportHip, torsoSize) {
  const footToKnee = getDistance(liftedFoot, supportKnee) / torsoSize;
  const footToHip = getDistance(liftedFoot, supportHip) / torsoSize;

  return Math.min(footToKnee, footToHip);
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

  const shoulderCenter = getMidpoint(leftShoulder, rightShoulder);
  const hipCenter = getMidpoint(leftHip, rightHip);
  const torsoSize = getNormalizedTorsoSize(landmarks);

  const leftKneeAngle = getAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = getAngle(rightHip, rightKnee, rightAnkle);
  const standingSide = leftKneeAngle >= rightKneeAngle ? 'left' : 'right';

  const supportHip = standingSide === 'left' ? leftHip : rightHip;
  const supportKnee = standingSide === 'left' ? leftKnee : rightKnee;
  const supportAnkle = standingSide === 'left' ? leftAnkle : rightAnkle;
  const liftedHip = standingSide === 'left' ? rightHip : leftHip;
  const liftedKnee = standingSide === 'left' ? rightKnee : leftKnee;
  const liftedAnkle = standingSide === 'left' ? rightAnkle : leftAnkle;

  const supportLegAngle = standingSide === 'left' ? leftKneeAngle : rightKneeAngle;
  const liftedLegAngle = standingSide === 'left' ? rightKneeAngle : leftKneeAngle;
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / torsoSize;
  const hipTilt = Math.abs(leftHip.y - rightHip.y) / torsoSize;
  const uprightOffset =
    (Math.abs(shoulderCenter.x - hipCenter.x) + Math.abs(nose.x - hipCenter.x)) / 2 / torsoSize;
  const wristHeight =
    ((leftShoulder.y - leftWrist.y) + (rightShoulder.y - rightWrist.y)) / 2 / torsoSize;
  const armSpread = Math.abs(leftWrist.x - rightWrist.x) / torsoSize;
  const footPlacementScore = getFootPlacementScore(liftedAnkle, supportKnee, supportHip, torsoSize);
  const bodyCenterOffset = Math.abs(hipCenter.x - 0.5) / torsoSize;
  const liftedKneeLift = Math.abs(liftedKnee.x - hipCenter.x) / torsoSize;
  const supportFootDrift = Math.abs(supportAnkle.x - supportHip.x) / torsoSize;
  const liftedFootHeight = Math.abs(liftedHip.y - liftedAnkle.y) / torsoSize;

  let score = 100;

  // Tree Pose still needs a tall stacked torso like Mountain Pose.
  score -= clampPenalty(uprightOffset * 130, 20);

  // Balanced hips and shoulders help show steady balance.
  score -= clampPenalty(shoulderTilt * 140, 15);
  score -= clampPenalty(hipTilt * 120, 14);

  // The support leg should stay straight and stable.
  score -= clampPenalty((172 - supportLegAngle) * 0.45, 12);

  // The lifted leg should bend and draw inward toward the standing leg.
  score -= clampPenalty((liftedLegAngle - 125) * 0.28, 12);
  score -= clampPenalty((footPlacementScore - 0.95) * 18, 14);
  score -= clampPenalty((0.22 - liftedKneeLift) * 30, 8);
  score -= clampPenalty((0.45 - liftedFootHeight) * 24, 9);

  // Arms are considered good when they rise above the shoulders with calm spacing.
  score -= clampPenalty((0.22 - wristHeight) * 50, 12);
  score -= clampPenalty((0.45 - armSpread) * 22, 8);

  // A small centering rule helps the whole pose stay visible in frame.
  score -= clampPenalty((bodyCenterOffset - 0.18) * 36, 10);
  score -= clampPenalty((supportFootDrift - 0.18) * 30, 7);

  const feedbackMessages = [];

  if (uprightOffset > 0.12) {
    feedbackMessages.push('Stand taller through your spine');
  }

  if (shoulderTilt > 0.07 || hipTilt > 0.08) {
    feedbackMessages.push('Keep your hips and shoulders level');
  }

  if (supportLegAngle < 170) {
    feedbackMessages.push('Press strongly through your standing leg');
  }

  if (liftedLegAngle > 132 || footPlacementScore > 1.05 || liftedFootHeight < 0.42) {
    feedbackMessages.push('Place your lifted foot higher on the opposite leg');
  }

  if (wristHeight < 0.2 || armSpread < 0.4) {
    feedbackMessages.push('Reach both arms upward');
  }

  if (bodyCenterOffset > 0.24) {
    feedbackMessages.push('Stand centered in the camera frame');
  }

  if (!feedbackMessages.length || score >= 88) {
    feedbackMessages.unshift('Nice balance, hold your Tree Pose steady');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    feedbackMessages: feedbackMessages.slice(0, 4),
    debug: {
      standingSide,
      supportLegAngle: Number(supportLegAngle.toFixed(1)),
      liftedLegAngle: Number(liftedLegAngle.toFixed(1)),
      shoulderTilt: Number(shoulderTilt.toFixed(2)),
      hipTilt: Number(hipTilt.toFixed(2)),
      wristHeight: Number(wristHeight.toFixed(2)),
      footPlacementScore: Number(footPlacementScore.toFixed(2)),
    },
  };
}
