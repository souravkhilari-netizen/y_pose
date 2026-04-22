import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import FeedbackPanel from '../components/FeedbackPanel';
import PoseCamera from '../components/PoseCamera';
import { poses } from '../data/poses';

function PracticePage() {
  const { poseId } = useParams();
  const location = useLocation();
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [evaluation, setEvaluation] = useState({
    mode: poseId === 'mountain-pose' ? 'mountain' : 'placeholder',
    score: poseId === 'mountain-pose' ? 0 : null,
    messages:
      poseId === 'mountain-pose'
        ? ['Stand fully in front of the camera']
        : ['Live evaluation for this pose will be added later.'],
    summary:
      poseId === 'mountain-pose'
        ? 'Move into frame so Mountain Pose can be evaluated.'
        : 'Rule-based live scoring is currently available only for Mountain Pose.',
  });

  const selectedPose = poses.find((pose) => pose.id === poseId);
  const poseName = location.state?.poseName || selectedPose?.name || 'Selected Pose';

  useEffect(() => {
    setImageUnavailable(false);
  }, [poseId]);

  useEffect(() => {
    setEvaluation({
      mode: poseId === 'mountain-pose' ? 'mountain' : 'placeholder',
      score: poseId === 'mountain-pose' ? 0 : null,
      messages:
        poseId === 'mountain-pose'
          ? ['Stand fully in front of the camera']
          : ['Live evaluation for this pose will be added later.'],
      summary:
        poseId === 'mountain-pose'
          ? 'Move into frame so Mountain Pose can be evaluated.'
          : 'Rule-based live scoring is currently available only for Mountain Pose.',
    });
  }, [poseId]);

  return (
    <section className="section">
      <div className="section__heading">
        <p className="eyebrow">Step 2</p>
        <h1>{poseName}</h1>
        <p>This is the practice layout. Detection and feedback logic can be connected later.</p>
      </div>

      <div className="practice-layout">
        <section className="practice-panel practice-panel--reference">
          <div className="panel-label">Reference Pose</div>
          <h3>{poseName}</h3>
          <p>{selectedPose?.description || 'Reference guidance for the selected pose will appear here.'}</p>
          <div className="reference-card">
            {selectedPose?.image && !imageUnavailable ? (
              <img
                src={selectedPose.image}
                alt={poseName}
                className="reference-image"
                onError={() => setImageUnavailable(true)}
              />
            ) : (
              <div className="reference-fallback">Reference image not available</div>
            )}
          </div>
          {selectedPose?.benefits ? (
            <p className="practice-note">Benefits: {selectedPose.benefits}</p>
          ) : null}
        </section>

        <section className="practice-panel practice-panel--camera">
          <div className="panel-label">Camera Area</div>
          <h3>Live Camera Preview</h3>
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
