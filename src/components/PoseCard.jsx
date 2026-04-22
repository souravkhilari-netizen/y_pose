function PoseCard({ pose, onSelect }) {
  return (
    <article className="pose-card">
      <div className="pose-card__image">
        {pose.image ? (
          <img src={pose.image} alt={pose.name} className="pose-card__img" />
        ) : (
          <div className="pose-card__placeholder">Image Placeholder</div>
        )}
      </div>

      <div className="pose-card__content">
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
