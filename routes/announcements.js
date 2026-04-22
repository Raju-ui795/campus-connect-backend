const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

// GET all announcements
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new announcement (faculty/admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only faculty or admin can post announcements' });
    }
    const { title, content, category, postedByName } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO announcements (title, content, category, posted_by, posted_by_name) VALUES (?, ?, ?, ?, ?)',
      [title, content, category || 'General', req.user.id, postedByName || 'Faculty']
    );
    const [rows] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE announcement
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await pool.execute('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
