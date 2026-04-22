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

export function evaluateMountainPose(landmarks) {
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
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
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

  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / torsoSize;
  const uprightOffset =
    (Math.abs(shoulderCenter.x - hipCenter.x) + Math.abs(nose.x - hipCenter.x)) / 2 / torsoSize;
  const leftArmAngle = getAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = getAngle(rightShoulder, rightElbow, rightWrist);
  const leftKneeAngle = getAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = getAngle(rightHip, rightKnee, rightAnkle);
  const leftWristToHip = getDistance(leftWrist, leftHip) / torsoSize;
  const rightWristToHip = getDistance(rightWrist, rightHip) / torsoSize;
  const wristDrop =
    ((leftWrist.y - leftShoulder.y) + (rightWrist.y - rightShoulder.y)) / 2 / torsoSize;
  const bodyCenterOffset = Math.abs(hipCenter.x - 0.5) / torsoSize;

  let score = 100;

  // Upright posture checks whether the head, shoulders, and hips stay stacked.
  score -= clampPenalty(uprightOffset * 130, 22);

  // Level shoulders suggest a balanced standing position.
  score -= clampPenalty(shoulderTilt * 150, 18);

  // In Mountain Pose, the arms should hang fairly straight and close to the hips.
  score -= clampPenalty((170 - leftArmAngle) * 0.45, 10);
  score -= clampPenalty((170 - rightArmAngle) * 0.45, 10);
  score -= clampPenalty((0.95 - leftWristToHip) * 18, 8);
  score -= clampPenalty((0.95 - rightWristToHip) * 18, 8);
  score -= clampPenalty((1.05 - wristDrop) * 24, 10);

  // Straighter knees usually indicate a more stable vertical posture.
  score -= clampPenalty((170 - leftKneeAngle) * 0.35, 8);
  score -= clampPenalty((170 - rightKneeAngle) * 0.35, 8);

  // A light centering rule helps keep the full body visible in frame.
  score -= clampPenalty((bodyCenterOffset - 0.15) * 36, 10);

  const feedbackMessages = [];

  if (uprightOffset > 0.12) {
    feedbackMessages.push('Stand straighter');
  }

  if (shoulderTilt > 0.06) {
    feedbackMessages.push('Keep your shoulders level');
  }

  if (
    leftArmAngle < 165 ||
    rightArmAngle < 165 ||
    leftWristToHip < 0.9 ||
    rightWristToHip < 0.9 ||
    wristDrop < 1
  ) {
    feedbackMessages.push('Keep both arms relaxed by your sides');
  }

  if (leftKneeAngle < 168 || rightKneeAngle < 168) {
    feedbackMessages.push('Straighten your knees slightly');
  }

  if (bodyCenterOffset > 0.22) {
    feedbackMessages.push('Stand centered in the camera frame');
  }

  if (!feedbackMessages.length || score >= 88) {
    feedbackMessages.unshift('Good alignment, hold steady');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    feedbackMessages: feedbackMessages.slice(0, 4),
    debug: {
      uprightOffset: Number(uprightOffset.toFixed(2)),
      shoulderTilt: Number(shoulderTilt.toFixed(2)),
      leftArmAngle: Number(leftArmAngle.toFixed(1)),
      rightArmAngle: Number(rightArmAngle.toFixed(1)),
      leftKneeAngle: Number(leftKneeAngle.toFixed(1)),
      rightKneeAngle: Number(rightKneeAngle.toFixed(1)),
      centeredOffset: Number(bodyCenterOffset.toFixed(2)),
    },
  };
}
