const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

// GET my profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, department, year, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = users[0];

    // Get registered events
    const [events] = await pool.execute(
      `SELECT e.id, e.title, e.date, e.venue 
       FROM events e 
       JOIN event_registrations er ON e.id = er.event_id 
       WHERE er.user_id = ?`,
      [req.user.id]
    );

    // Get achievements
    const [achievements] = await pool.execute(
      'SELECT * FROM achievements WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ ...user, eventsRegistered: events, achievements });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, department, year, bio } = req.body;
    await pool.execute(
      'UPDATE users SET name = ?, department = ?, year = ?, bio = ? WHERE id = ?',
      [name, department || '', year || '', bio || '', req.user.id]
    );
    const [users] = await pool.execute(
      'SELECT id, name, email, role, department, year, bio FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST add achievement
router.post('/achievement', authMiddleware, async (req, res) => {
  try {
    const { title, date } = req.body;
    await pool.execute(
      'INSERT INTO achievements (user_id, title, date) VALUES (?, ?, ?)',
      [req.user.id, title, date]
    );

    // Return updated profile
    const [users] = await pool.execute(
      'SELECT id, name, email, role, department, year, bio FROM users WHERE id = ?',
      [req.user.id]
    );
    const [achievements] = await pool.execute(
      'SELECT * FROM achievements WHERE user_id = ?',
      [req.user.id]
    );
    const [events] = await pool.execute(
      `SELECT e.id, e.title, e.date, e.venue 
       FROM events e 
       JOIN event_registrations er ON e.id = er.event_id 
       WHERE er.user_id = ?`,
      [req.user.id]
    );

    res.json({ ...users[0], achievements, eventsRegistered: events });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
