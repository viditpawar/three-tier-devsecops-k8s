import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../api/leaderboard.js';

export default function Leaderboard({ refreshKey }) {
  const [scores, setScores] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchLeaderboard(10)
      .then((data) => {
        if (!cancelled) setScores(data);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load leaderboard');
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return <p className="leaderboard__error">{error}</p>;
  }

  return (
    <div className="leaderboard">
      <h2>Top Scores</h2>
      <ol>
        {scores.map((entry, index) => (
          <li key={`${entry.playerName}-${entry.createdAt}-${index}`}>
            <span>{entry.playerName}</span>
            <span>{entry.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
