import { useNavigate } from 'react-router-dom';
import PoseCard from '../components/PoseCard';
import { poses } from '../data/poses';

function PoseSelectionPage() {
  const navigate = useNavigate();

  const handlePoseSelect = (pose) => {
    // We pass the pose name in route state so the practice page can show it cleanly.
    navigate(`/practice/${pose.id}`, {
      state: { poseName: pose.name },
    });
  };

  return (
    <section className="section section--selection">
      <div className="section__heading section__heading--wide">
        <p className="eyebrow">Step 1</p>
        <h1>Select a Pose</h1>
        <p>
          Choose a guided pose to open the live practice view with reference imagery,
          camera tracking, and real-time feedback.
        </p>
      </div>

      <div className="pose-grid">
        {poses.map((pose) => (
          <PoseCard key={pose.id} pose={pose} onSelect={handlePoseSelect} />
        ))}
      </div>
    </section>
  );
}

export default PoseSelectionPage;
