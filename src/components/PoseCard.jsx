import { useState } from 'react';

function PoseCard({ pose, onSelect }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);

  return (
    <article className="pose-card">
      <div className="pose-card__image">
        <div className="pose-card__badge">Guided Practice</div>
        {pose.image && !imageUnavailable ? (
          <img
            src={pose.image}
            alt={pose.name}
            className="pose-card__img"
            onError={() => setImageUnavailable(true)}
          />
        ) : (
          <div className="pose-card__placeholder">
            <span className="pose-card__placeholder-title">{pose.name}</span>
            <span>Reference image preview will appear here</span>
          </div>
        )}
      </div>

      <div className="pose-card__content">
        <p className="pose-card__eyebrow">Yoga Pose</p>
        <h3>{pose.name}</h3>
        <p>{pose.description}</p>
        {pose.benefits ? <p className="pose-card__benefits">Benefits: {pose.benefits}</p> : null}
        <button type="button" className="button button--secondary" onClick={() => onSelect(pose)}>
          Practice This Pose
        </button>
      </div>
    </article>
  );
}

export default PoseCard;
