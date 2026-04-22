const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

// GET all events
router.get('/', async (req, res) => {
  try {
    const [events] = await pool.execute('SELECT * FROM events ORDER BY created_at DESC');

    // Get registration count for each event
    for (let event of events) {
      const [regs] = await pool.execute(
        'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?',
        [event.id]
      );
      event.registered_count = regs[0].count;
    }

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create event (faculty/admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only faculty or admin can create events' });
    }
    const { title, description, date, time, venue, category, maxParticipants } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO events (title, description, date, time, venue, category, max_participants, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, date, time, venue, category || 'General', maxParticipants || 100, req.user.id]
    );
    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST register for event
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Check event exists
    const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) return res.status(404).json({ message: 'Event not found' });

    // Check already registered
    const [existing] = await pool.execute(
      'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    if (existing.length > 0) return res.status(400).json({ message: 'Already registered' });

    // Check capacity
    const [regs] = await pool.execute(
      'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?',
      [eventId]
    );
    if (regs[0].count >= events[0].max_participants) {
      return res.status(400).json({ message: 'Event is full' });
    }

    await pool.execute(
      'INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)',
      [eventId, userId]
    );

    res.json({ message: 'Registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST unregister from event
router.post('/:id/unregister', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Unregistered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
