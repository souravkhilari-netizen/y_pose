function FeedbackPanel({ poseName, className = '', evaluation }) {
  const messages = evaluation?.messages?.length
    ? evaluation.messages.slice(0, 4)
    : ['Live feedback will appear here once evaluation is active.'];
  const isPositive = messages[0]?.toLowerCase().includes('good') || messages[0]?.toLowerCase().includes('nice');
  const isLowScore = typeof evaluation?.score === 'number' && evaluation.score < 60;

  return (
    <section className={`practice-panel ${className}`.trim()}>
      <div className="feedback-panel__header">
        <div>
          <div className="panel-label">Live Feedback</div>
          <h3>Feedback Panel</h3>
        </div>
        <span className={`feedback-chip ${isPositive ? 'feedback-chip--positive' : ''}`}>
          {evaluation?.mode === 'tree' ? 'Tree Pose' : poseName || 'Pose'}
        </span>
      </div>
      <p className="feedback-summary">
        {evaluation?.summary || `Placeholder area for real-time pose feedback${poseName ? ` for ${poseName}` : ''}.`}
      </p>
      <div className={`score-card ${isPositive ? 'score-card--positive' : ''}`}>
        <span className="score-card__label">Live Score</span>
        <span className={`score-card__value ${isLowScore ? 'score-card__value--low' : ''}`.trim()}>
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
