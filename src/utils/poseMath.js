export function getDistance(pointA, pointB) {
  if (!pointA || !pointB) {
    return 0;
  }

  const deltaX = pointA.x - pointB.x;
  const deltaY = pointA.y - pointB.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

export function getMidpoint(pointA, pointB) {
  if (!pointA || !pointB) {
    return null;
  }

  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
  };
}

export function isLandmarkVisible(landmark, minimumVisibility = 0.5) {
  return Boolean(landmark) && (landmark.visibility ?? 1) >= minimumVisibility;
}

export function getAngle(pointA, pointB, pointC) {
  if (!pointA || !pointB || !pointC) {
    return 0;
  }

  const abX = pointA.x - pointB.x;
  const abY = pointA.y - pointB.y;
  const cbX = pointC.x - pointB.x;
  const cbY = pointC.y - pointB.y;

  const dotProduct = abX * cbX + abY * cbY;
  const magnitudeAB = Math.sqrt(abX * abX + abY * abY);
  const magnitudeCB = Math.sqrt(cbX * cbX + cbY * cbY);

  if (!magnitudeAB || !magnitudeCB) {
    return 0;
  }

  const cosine = Math.min(1, Math.max(-1, dotProduct / (magnitudeAB * magnitudeCB)));

  return (Math.acos(cosine) * 180) / Math.PI;
}

export function getNormalizedTorsoSize(landmarks) {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const shoulderCenter = getMidpoint(leftShoulder, rightShoulder);
  const hipCenter = getMidpoint(leftHip, rightHip);
  const shoulderWidth = getDistance(leftShoulder, rightShoulder);
  const hipWidth = getDistance(leftHip, rightHip);
  const torsoHeight = shoulderCenter && hipCenter ? getDistance(shoulderCenter, hipCenter) : 0;

  // We normalize by torso size so the checks stay useful for different body sizes
  // and different distances from the camera.
  return Math.max(torsoHeight, shoulderWidth, hipWidth, 0.12);
}
