import { useEffect, useRef, useState } from 'react';
import { createPoseLandmarker, POSE_MODEL_PATH, PoseLandmarker } from '../utils/poseLandmarker';
import { clearPoseCanvas, drawPoseResult, resizeCanvasToDisplaySize } from '../utils/drawPose';
import { evaluateMountainPose } from '../utils/poseRules/mountainPose';

function PoseCamera({ selectedPoseId, onEvaluationChange }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const feedbackHistoryRef = useRef([]);
  const lastFeedbackUpdateRef = useRef(0);

  const [cameraStatus, setCameraStatus] = useState('loading');
  const [cameraError, setCameraError] = useState('');
  const [poseStatus, setPoseStatus] = useState('loading-model');
  const [poseError, setPoseError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const stopDetectionLoop = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const clearOverlay = () => {
      if (!canvasRef.current) {
        return;
      }

      const context = canvasRef.current.getContext('2d');

      if (context) {
        clearPoseCanvas(canvasRef.current, context);
      }
    };

    const releasePoseLandmarker = () => {
      if (poseLandmarkerRef.current?.close) {
        poseLandmarkerRef.current.close();
      }

      poseLandmarkerRef.current = null;
    };

    const emitEvaluation = (nextEvaluation) => {
      onEvaluationChange?.(nextEvaluation);
    };

    const resetFeedbackForCurrentPose = () => {
      feedbackHistoryRef.current = [];
      lastFeedbackUpdateRef.current = 0;

      if (selectedPoseId === 'mountain-pose') {
        emitEvaluation({
          mode: 'mountain',
          score: 0,
          messages: ['Stand fully in front of the camera'],
          summary: 'Move into frame so Mountain Pose can be evaluated.',
        });
        return;
      }

      emitEvaluation({
        mode: 'placeholder',
        score: null,
        messages: ['Live evaluation for this pose will be added later.'],
        summary: 'Rule-based live scoring is currently available only for Mountain Pose.',
      });
    };

    const pushSmoothedMountainFeedback = (evaluation) => {
      const now = performance.now();

      feedbackHistoryRef.current.push(evaluation);
      feedbackHistoryRef.current = feedbackHistoryRef.current.slice(-5);

      if (now - lastFeedbackUpdateRef.current < 220) {
        return;
      }

      lastFeedbackUpdateRef.current = now;

      const averageScore = Math.round(
        feedbackHistoryRef.current.reduce((sum, item) => sum + item.score, 0) /
          feedbackHistoryRef.current.length
      );

      const messageCounts = new Map();

      feedbackHistoryRef.current.forEach((item) => {
        item.feedbackMessages.forEach((message) => {
          messageCounts.set(message, (messageCounts.get(message) || 0) + 1);
        });
      });

      const smoothedMessages = [...messageCounts.entries()]
        .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])
        .map(([message]) => message)
        .slice(0, 4);

      emitEvaluation({
        mode: 'mountain',
        score: averageScore,
        messages: smoothedMessages.length ? smoothedMessages : ['Good alignment, hold steady'],
        summary: 'Live Mountain Pose feedback based on simple body-alignment rules.',
        debug: evaluation.debug,
      });
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      });

      if (!isMounted) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return false;
      }

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      if (isMounted) {
        setCameraStatus('success');
      }

      return true;
    };

    const startPoseModel = async () => {
      const poseLandmarker = await createPoseLandmarker();

      if (!isMounted) {
        poseLandmarker.close();
        return false;
      }

      poseLandmarkerRef.current = poseLandmarker;
      setPoseStatus('no-pose');
      resetFeedbackForCurrentPose();
      return true;
    };

    const runDetectionLoop = () => {
      if (!isMounted || !videoRef.current || !canvasRef.current || !poseLandmarkerRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        return;
      }

      // We draw onto a canvas placed above the video so landmarks can sit on top
      // of the live camera feed without changing the actual video element.
      resizeCanvasToDisplaySize(canvas);

      // requestAnimationFrame keeps detection aligned with the browser render loop.
      const detectFrame = () => {
        if (!isMounted || !videoRef.current || !poseLandmarkerRef.current) {
          return;
        }

        if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;

          const result = poseLandmarkerRef.current.detectForVideo(video, performance.now());
          const primaryPose = result.landmarks?.[0] || [];

          drawPoseResult({
            canvas,
            context,
            video,
            landmarks: primaryPose,
            connections: PoseLandmarker.POSE_CONNECTIONS,
          });

          setPoseStatus(primaryPose.length ? 'pose-detected' : 'no-pose');

          if (!primaryPose.length) {
            resetFeedbackForCurrentPose();
          } else if (selectedPoseId === 'mountain-pose') {
            // We only run rule-based scoring for Mountain Pose right now.
            const evaluation = evaluateMountainPose(primaryPose);
            pushSmoothedMountainFeedback(evaluation);
          } else {
            emitEvaluation({
              mode: 'placeholder',
              score: null,
              messages: ['Live evaluation for this pose will be added later.'],
              summary: 'Rule-based live scoring is currently available only for Mountain Pose.',
            });
          }

          result.close?.();
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame);
      };

      detectFrame();
    };

    const initialize = async () => {
      try {
        setCameraStatus('loading');
        setPoseStatus('loading-model');

        await startCamera();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCameraStatus('error');

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError('Camera permission was denied. Please allow access and refresh the page.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setCameraError('No camera was found on this device.');
        } else {
          setCameraError(error.message || 'Unable to open the camera right now.');
        }

        setPoseStatus('error');
        setPoseError('Pose detection waits for a working camera feed.');
        emitEvaluation({
          mode: 'error',
          score: null,
          messages: ['Camera access is needed for live evaluation.'],
          summary: 'Allow camera access to start pose detection and scoring.',
        });
        return;
      }

      try {
        await startPoseModel();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPoseStatus('error');
        setPoseError(
          error.message ||
            `Unable to load the pose model. Place the file at public/models/pose_landmarker_lite.task.`
        );
        emitEvaluation({
          mode: 'error',
          score: null,
          messages: ['Pose model could not be loaded.'],
          summary:
            error.message ||
            'Place the model file at public/models/pose_landmarker_lite.task and reload the app.',
        });
        clearOverlay();
        return;
      }

      runDetectionLoop();
    };

    initialize();

    return () => {
      isMounted = false;
      stopDetectionLoop();
      clearOverlay();
      releasePoseLandmarker();
      stopCamera();
    };
  }, [onEvaluationChange, selectedPoseId]);

  return (
    <>
      <div className="camera-shell">
        {cameraStatus === 'loading' ? (
          <div className="camera-state">
            <p className="camera-state__title">Opening camera...</p>
            <p className="camera-state__text">
              Please wait while the browser connects to your webcam.
            </p>
          </div>
        ) : null}

        {cameraStatus === 'error' ? (
          <div className="camera-state camera-state--error">
            <p className="camera-state__title">Camera unavailable</p>
            <p className="camera-state__text">{cameraError}</p>
          </div>
        ) : null}

        <video
          ref={videoRef}
          className={cameraStatus === 'success' ? 'camera-video camera-video--mirrored' : 'camera-video camera-video--hidden'}
          autoPlay
          muted
          playsInline
        />

        <canvas
          ref={canvasRef}
          className={cameraStatus === 'success' ? 'camera-overlay camera-overlay--mirrored' : 'camera-overlay camera-overlay--hidden'}
        />
      </div>

      <div className="status-strip" aria-live="polite">
        <div className="status-chip">
          <span className="status-chip__label">Camera</span>
          <span className="status-chip__value">
            {cameraStatus === 'loading' ? 'Opening camera...' : null}
            {cameraStatus === 'success' ? 'Live camera ready' : null}
            {cameraStatus === 'error' ? 'Camera unavailable' : null}
          </span>
        </div>

        <div className={`status-chip ${poseStatus === 'pose-detected' ? 'status-chip--success' : ''} ${poseStatus === 'error' ? 'status-chip--error' : ''}`.trim()}>
          <span className="status-chip__label">Pose</span>
          <span className="status-chip__value">
            {poseStatus === 'loading-model' ? 'Loading pose model...' : null}
            {poseStatus === 'pose-detected' ? 'Pose detected' : null}
            {poseStatus === 'no-pose' ? 'No pose detected' : null}
            {poseStatus === 'error' ? poseError : null}
          </span>
        </div>
      </div>

      {poseStatus === 'error' && poseError.includes('public/models/pose_landmarker_lite.task') ? (
        <p className="practice-note">
          Developer note: place the model file at <code>{POSE_MODEL_PATH}</code>.
        </p>
      ) : null}
    </>
  );
}

export default PoseCamera;
