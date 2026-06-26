const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { query } = require('../database');

// ============= PARTICIPANTS =============

/**
 * GET /api/participants
 * Get all participants with optional filtering
 */
router.get('/participants', async (req, res) => {
  try {
    const { school, limit = 100, offset = 0, search } = req.query;
    let sql = 'SELECT * FROM participants';
    const params = [];

    if (school) {
      sql += ` WHERE school ILIKE $${params.length + 1}`;
      params.push(`%${school}%`);
    }

    if (search) {
      const condition = `(first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      sql += params.length > 0 ? ` AND ${condition}` : ` WHERE ${condition}`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY last_name, first_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({
      count: result.rows.length,
      participants: result.rows,
    });
  } catch (error) {
    logger.error('Error retrieving participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/participants/:id
 * Get participant details with registration and attendance history
 */
router.get('/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const participantResult = await query(
      'SELECT * FROM participants WHERE id = $1',
      [id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const registrationsResult = await query(
      'SELECT * FROM registrations WHERE participant_id = $1 ORDER BY event_date DESC',
      [id]
    );

    const attendanceResult = await query(
      'SELECT * FROM attendance WHERE participant_id = $1 ORDER BY check_in_time DESC',
      [id]
    );

    res.json({
      participant: participantResult.rows[0],
      registrations: registrationsResult.rows,
      attendance: attendanceResult.rows,
    });
  } catch (error) {
    logger.error('Error retrieving participant details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= REGISTRATIONS =============

/**
 * GET /api/registrations
 * Get all registrations with optional filtering
 */
router.get('/registrations', async (req, res) => {
  try {
    const { eventName, status, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT r.*, p.first_name, p.last_name, p.email FROM registrations r JOIN participants p ON r.participant_id = p.id';
    const params = [];

    if (eventName) {
      sql += ` WHERE r.event_name ILIKE $${params.length + 1}`;
      params.push(`%${eventName}%`);
    }

    if (status) {
      const operator = params.length > 0 ? ' AND ' : ' WHERE ';
      sql += `${operator} r.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY r.event_date DESC, r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({
      count: result.rows.length,
      registrations: result.rows,
    });
  } catch (error) {
    logger.error('Error retrieving registrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= ATTENDANCE =============

/**
 * GET /api/attendance
 * Get all attendance records with optional filtering
 */
router.get('/attendance', async (req, res) => {
  try {
    const { eventName, status = 'present', limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT a.*, p.first_name, p.last_name FROM attendance a JOIN participants p ON a.participant_id = p.id';
    const params = [];

    if (eventName) {
      sql += ` WHERE a.event_name ILIKE $${params.length + 1}`;
      params.push(`%${eventName}%`);
    }

    if (status) {
      const operator = params.length > 0 ? ' AND ' : ' WHERE ';
      sql += `${operator} a.attendance_status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY a.check_in_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({
      count: result.rows.length,
      attendance: result.rows,
    });
  } catch (error) {
    logger.error('Error retrieving attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= REPORTS/ANALYTICS =============

/**
 * GET /api/reports/participant-summary
 * Get summary statistics for all participants
 */
router.get('/reports/participant-summary', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        id,
        first_name,
        last_name,
        email,
        school,
        registration_count,
        attendance_count,
        total_hours
       FROM participant_summary
       ORDER BY total_hours DESC`
    );
    res.json({ summary: result.rows });
  } catch (error) {
    logger.error('Error retrieving participant summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/event-summary
 * Get summary statistics for all events
 */
router.get('/reports/event-summary', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        event_name,
        event_date,
        total_registered,
        checked_in,
        attended,
        total_fees,
        fees_paid
       FROM event_summary
       ORDER BY event_date DESC`
    );
    res.json({ summary: result.rows });
  } catch (error) {
    logger.error('Error retrieving event summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/stats
 * Get overall system statistics
 */
router.get('/reports/stats', async (req, res) => {
  try {
    const statsResult = await query(
      `SELECT
        (SELECT COUNT(*) FROM participants) as total_participants,
        (SELECT COUNT(*) FROM registrations) as total_registrations,
        (SELECT COUNT(*) FROM registrations WHERE status = 'checked_in') as checked_in_count,
        (SELECT COUNT(*) FROM attendance) as total_attendance,
        (SELECT COUNT(DISTINCT event_name) FROM registrations) as total_events,
        (SELECT COALESCE(SUM(fee_amount), 0) FROM registrations WHERE fee_paid = true) as total_fees_collected`
    );

    res.json({ stats: statsResult.rows[0] });
  } catch (error) {
    logger.error('Error retrieving statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
