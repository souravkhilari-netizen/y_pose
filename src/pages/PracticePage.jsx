import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import FeedbackPanel from '../components/FeedbackPanel';
import PoseCamera from '../components/PoseCamera';
import { poses } from '../data/poses';

function getInitialEvaluation(poseId) {
  if (poseId === 'mountain-pose') {
    return {
      mode: 'mountain',
      score: 0,
      messages: ['Stand fully in front of the camera'],
      summary: 'Move into frame so Mountain Pose can be evaluated.',
    };
  }

  if (poseId === 'tree-pose') {
    return {
      mode: 'tree',
      score: 0,
      messages: ['Stand fully in front of the camera'],
      summary: 'Move into frame so Tree Pose can be evaluated.',
    };
  }

  return {
    mode: 'placeholder',
    score: null,
    messages: ['Live evaluation for this pose will be added later.'],
    summary: 'Rule-based live scoring is currently available only for supported poses.',
  };
}

function PracticePage() {
  const { poseId } = useParams();
  const location = useLocation();
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [evaluation, setEvaluation] = useState(getInitialEvaluation(poseId));

  const selectedPose = poses.find((pose) => pose.id === poseId);
  const poseName = location.state?.poseName || selectedPose?.name || 'Selected Pose';

  useEffect(() => {
    setImageUnavailable(false);
  }, [poseId]);

  useEffect(() => {
    setEvaluation(getInitialEvaluation(poseId));
  }, [poseId]);

  return (
    <section className="section section--practice">
      <div className="section__heading section__heading--wide">
        <p className="eyebrow">Step 2</p>
        <h1>{poseName}</h1>
        <p>
          Use the live camera preview to compare your posture against the reference pose and
          follow the feedback panel for steady alignment guidance.
        </p>
      </div>

      <div className="practice-layout">
        <section className="practice-panel practice-panel--reference">
          <div className="reference-panel__header">
            <div>
              <div className="panel-label">Reference Pose</div>
              <h3>{poseName}</h3>
            </div>
            <span className="reference-tag">Training View</span>
          </div>

          <p className="reference-description">
            {selectedPose?.description || 'Reference guidance for the selected pose will appear here.'}
          </p>

          <div className={`reference-card ${poseId === 'tree-pose' ? 'reference-card--tree' : ''}`}>
            <div className="reference-card__glow" />
            {selectedPose?.image && !imageUnavailable ? (
              <div className="reference-image-frame">
                <img
                  src={selectedPose.image}
                  alt={poseName}
                  className="reference-image"
                  onError={() => setImageUnavailable(true)}
                />
              </div>
            ) : (
              <div className="reference-fallback">
                <span className="reference-fallback__title">Reference image not available</span>
                <span className="reference-fallback__text">
                  Add a pose image in the `public/poses` folder to show a training reference here.
                </span>
              </div>
            )}
          </div>

          {selectedPose?.benefits ? (
            <p className="practice-note practice-note--highlight">Benefits: {selectedPose.benefits}</p>
          ) : null}
        </section>

        <section className="practice-panel practice-panel--camera">
          <div className="camera-panel__header">
            <div>
              <div className="panel-label">Camera Area</div>
              <h3>Live Camera Preview</h3>
            </div>
            <span className="camera-panel__tag">Main Focus</span>
          </div>
          <PoseCamera selectedPoseId={poseId} onEvaluationChange={setEvaluation} />
          <p className="practice-note">
            The live camera feed now includes a landmark overlay powered by MediaPipe Pose.
          </p>
        </section>

        <FeedbackPanel poseName={poseName} className="practice-panel--feedback" evaluation={evaluation} />
      </div>

      <Link to="/poses" className="text-link">
        Back to pose selection
      </Link>
    </section>
  );
}

export default PracticePage;
