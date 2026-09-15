import { useCallback, useState } from 'react';
import SnakeGame from './components/SnakeGame.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import { submitScore } from './api/leaderboard.js';
import './App.css';

export default function App() {
  const [lastScore, setLastScore] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGameOver = useCallback((score) => {
    setLastScore(score);
    setSubmitStatus('idle');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!playerName.trim() || lastScore === null) return;

    setSubmitStatus('submitting');
    try {
      await submitScore(playerName.trim(), lastScore);
      setSubmitStatus('success');
      setLastScore(null);
      setPlayerName('');
      setRefreshKey((k) => k + 1);
    } catch {
      setSubmitStatus('error');
    }
  }

  return (
    <div className="app">
      <h1>Snake</h1>
      <div className="app__layout">
        <SnakeGame onGameOver={handleGameOver} />
        <Leaderboard refreshKey={refreshKey} />
      </div>

      {lastScore !== null && (
        <form className="score-form" onSubmit={handleSubmit}>
          <p>Game over! Final score: {lastScore}</p>
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            maxLength={20}
            onChange={(e) => setPlayerName(e.target.value)}
            required
          />
          <button type="submit" disabled={submitStatus === 'submitting'}>
            Submit Score
          </button>
          {submitStatus === 'error' && <span className="score-form__error">Submission failed</span>}
        </form>
      )}
    </div>
  );
}
