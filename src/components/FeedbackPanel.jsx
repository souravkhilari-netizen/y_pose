function FeedbackPanel({ poseName, className = '', evaluation }) {
  const messages = evaluation?.messages?.length
    ? evaluation.messages.slice(0, 4)
    : ['Live feedback will appear here once evaluation is active.'];

  return (
    <section className={`practice-panel ${className}`.trim()}>
      <div className="panel-label">Live Feedback</div>
      <h3>Feedback Panel</h3>
      <p>{evaluation?.summary || `Placeholder area for real-time pose feedback${poseName ? ` for ${poseName}` : ''}.`}</p>
      <div className="score-card">
        <span className="score-card__label">Live Score</span>
        <span className="score-card__value">
          {typeof evaluation?.score === 'number' ? `${evaluation.score}/100` : '--'}
        </span>
      </div>
      <ul className="feedback-list">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
}

export default FeedbackPanel;
