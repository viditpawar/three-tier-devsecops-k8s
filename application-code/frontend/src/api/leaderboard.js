const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchLeaderboard(limit = 10) {
  const res = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}`);

  if (!res.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return res.json();
}

export async function submitScore(playerName, score) {
  const res = await fetch(`${API_BASE_URL}/leaderboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, score }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to submit score');
  }

  return res.json();
}
