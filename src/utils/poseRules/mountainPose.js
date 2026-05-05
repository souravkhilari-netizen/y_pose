import {
  getAngle,
  getDistance,
  getMidpoint,
  getNormalizedTorsoSize,
  isLandmarkVisible,
} from '../poseMath';

const REQUIRED_INDEXES = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function toScore(value, minimum, maximum) {
  if (maximum === minimum) {
    return 0;
  }

  return clamp((value - minimum) / (maximum - minimum), 0, 1);
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

  const torsoUpright =
    (Math.abs(shoulderCenter.x - hipCenter.x) + Math.abs(nose.x - hipCenter.x)) / 2 / torsoSize;
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / torsoSize;
  const hipTilt = Math.abs(leftHip.y - rightHip.y) / torsoSize;
  const leftLegAngle = getAngle(leftHip, leftKnee, leftAnkle);
  const rightLegAngle = getAngle(rightHip, rightKnee, rightAnkle);
  const leftArmAngle = getAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = getAngle(rightShoulder, rightElbow, rightWrist);

  const leftWristBelowShoulder = leftWrist.y > leftShoulder.y;
  const rightWristBelowShoulder = rightWrist.y > rightShoulder.y;
  const leftWristNearHip = getDistance(leftWrist, leftHip) / torsoSize;
  const rightWristNearHip = getDistance(rightWrist, rightHip) / torsoSize;
  const leftWristNearThigh = getDistance(leftWrist, leftKnee) / torsoSize;
  const rightWristNearThigh = getDistance(rightWrist, rightKnee) / torsoSize;
  const leftArmCloseToSide = Math.abs(leftWrist.x - leftHip.x) / torsoSize;
  const rightArmCloseToSide = Math.abs(rightWrist.x - rightHip.x) / torsoSize;
  const bodyCenterOffset = Math.abs(hipCenter.x - 0.5) / torsoSize;

  const bothWristsAboveShoulders = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
  const oneWristAboveShoulder = leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y;

  const torsoPoints =
    (1 - clamp(torsoUpright / 0.18, 0, 1)) * 20;

  const levelPoints =
    ((1 - clamp(shoulderTilt / 0.12, 0, 1)) * 0.55 +
      (1 - clamp(hipTilt / 0.12, 0, 1)) * 0.45) * 20;

  const legPoints =
    ((toScore(leftLegAngle, 158, 178) + toScore(rightLegAngle, 158, 178)) / 2) * 25;

  // Arms are best when wrists stay below the shoulders and near the hips/thighs.
  const leftArmDownScore =
    (leftWristBelowShoulder ? 0.4 : 0) +
    (1 - clamp(leftWristNearHip / 1.15, 0, 1)) * 0.25 +
    (1 - clamp(leftWristNearThigh / 1.3, 0, 1)) * 0.15 +
    (1 - clamp(leftArmCloseToSide / 0.55, 0, 1)) * 0.1 +
    toScore(leftArmAngle, 145, 178) * 0.1;

  const rightArmDownScore =
    (rightWristBelowShoulder ? 0.4 : 0) +
    (1 - clamp(rightWristNearHip / 1.15, 0, 1)) * 0.25 +
    (1 - clamp(rightWristNearThigh / 1.3, 0, 1)) * 0.15 +
    (1 - clamp(rightArmCloseToSide / 0.55, 0, 1)) * 0.1 +
    toScore(rightArmAngle, 145, 178) * 0.1;

  let armPoints = ((leftArmDownScore + rightArmDownScore) / 2) * 25;

  if (oneWristAboveShoulder) {
    armPoints -= 10;
  }

  if (bothWristsAboveShoulders) {
    armPoints -= 18;
  }

  armPoints = clamp(armPoints, 0, 25);

  const visibilityPoints = (1 - clamp(bodyCenterOffset / 0.28, 0, 1)) * 10;

  let score = torsoPoints + levelPoints + legPoints + armPoints + visibilityPoints;

  // Strong anti-false-positive guard: both arms raised should not look like Mountain Pose.
  if (bothWristsAboveShoulders) {
    score = Math.min(score, 55);
  }

  score = Math.round(clamp(score, 0, 100));

  const armsDownBySides =
    leftWristBelowShoulder &&
    rightWristBelowShoulder &&
    leftArmCloseToSide < 0.42 &&
    rightArmCloseToSide < 0.42;

  const feedbackMessages = [];

  if (bothWristsAboveShoulders || oneWristAboveShoulder) {
    feedbackMessages.push('Lower both arms by your sides');
  }

  if (
    !armsDownBySides ||
    leftWristNearHip > 0.92 ||
    rightWristNearHip > 0.92 ||
    leftWristNearThigh > 1.1 ||
    rightWristNearThigh > 1.1
  ) {
    feedbackMessages.push('Keep your hands relaxed near your thighs');
  }

  if (torsoUpright > 0.11) {
    feedbackMessages.push('Stand tall and keep your spine upright');
  }

  if (leftLegAngle < 166 || rightLegAngle < 166) {
    feedbackMessages.push('Keep both legs straight and stable');
  }

  if (shoulderTilt > 0.06 || hipTilt > 0.07) {
    feedbackMessages.push('Keep your shoulders level');
  }

  if (bodyCenterOffset > 0.23) {
    feedbackMessages.push('Stand centered in the camera frame');
  }

  if (score >= 88 && !bothWristsAboveShoulders) {
    feedbackMessages.unshift('Good Mountain Pose, hold steady');
  }

  return {
    score,
    feedbackMessages: feedbackMessages.slice(0, 4),
    debug: {
      leftWristY: Number(leftWrist.y.toFixed(3)),
      rightWristY: Number(rightWrist.y.toFixed(3)),
      leftShoulderY: Number(leftShoulder.y.toFixed(3)),
      rightShoulderY: Number(rightShoulder.y.toFixed(3)),
      armsRaised: bothWristsAboveShoulders || oneWristAboveShoulder,
      armsDownBySides,
      leftLegAngle: Number(leftLegAngle.toFixed(1)),
      rightLegAngle: Number(rightLegAngle.toFixed(1)),
      torsoUpright: Number(torsoUpright.toFixed(2)),
      shoulderTilt: Number(shoulderTilt.toFixed(2)),
      hipTilt: Number(hipTilt.toFixed(2)),
    },
  };
}
