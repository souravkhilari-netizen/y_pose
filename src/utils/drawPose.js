export function clearPoseCanvas(canvas, context) {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

export function resizeCanvasToDisplaySize(canvas) {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

function getCoverLayout(video, canvas) {
  const videoWidth = video.videoWidth || canvas.width;
  const videoHeight = video.videoHeight || canvas.height;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  if (videoAspect > canvasAspect) {
    const scale = canvasHeight / videoHeight;
    const scaledWidth = videoWidth * scale;

    return {
      width: scaledWidth,
      height: canvasHeight,
      offsetX: (canvasWidth - scaledWidth) / 2,
      offsetY: 0,
    };
  }

  const scale = canvasWidth / videoWidth;
  const scaledHeight = videoHeight * scale;

  return {
    width: canvasWidth,
    height: scaledHeight,
    offsetX: 0,
    offsetY: (canvasHeight - scaledHeight) / 2,
  };
}

function toCanvasPoint(landmark, layout) {
  return {
    x: layout.offsetX + landmark.x * layout.width,
    y: layout.offsetY + landmark.y * layout.height,
  };
}

export function drawPoseResult({
  canvas,
  context,
  video,
  landmarks = [],
  connections = [],
}) {
  clearPoseCanvas(canvas, context);

  if (!landmarks.length) {
    return;
  }

  const layout = getCoverLayout(video, canvas);

  connections.forEach((connection) => {
    const start = landmarks[connection.start];
    const end = landmarks[connection.end];

    if (!start || !end) {
      return;
    }

    if ((start.visibility ?? 1) < 0.35 || (end.visibility ?? 1) < 0.35) {
      return;
    }

    const startPoint = toCanvasPoint(start, layout);
    const endPoint = toCanvasPoint(end, layout);

    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.strokeStyle = '#9ee6b3';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.stroke();
  });

  landmarks.forEach((landmark) => {
    if ((landmark.visibility ?? 1) < 0.35) {
      return;
    }

    const point = toCanvasPoint(landmark, layout);

    context.beginPath();
    context.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    context.fillStyle = '#1f8f52';
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#effcf2';
    context.stroke();
  });
}
