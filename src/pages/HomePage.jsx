import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <section className="hero">
      <div className="hero__content">
        <p className="eyebrow">Yoga Pose Detection MVP</p>
        <h1>Practice yoga poses with a simple guided flow.</h1>
        <p className="hero__description">
          This frontend MVP helps users choose a pose and enter a practice screen where
          pose reference, camera input, and feedback will be connected later.
        </p>
        <Link to="/poses" className="button">
          Start Practice
        </Link>
      </div>
    </section>
  );
}

export default HomePage;
