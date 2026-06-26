const logger = require('../utils/logger');
const { query } = require('../database');

/**
 * Handle different Webconnex event types
 */
const eventHandlers = {
  'participant.created': handleParticipantCreated,
  'participant.updated': handleParticipantUpdated,
  'registration.created': handleRegistrationCreated,
  'registration.updated': handleRegistrationUpdated,
  'attendance.checked_in': handleAttendanceCheckedIn,
  'attendance.checked_out': handleAttendanceCheckedOut,
};

/**
 * Process Webconnex event based on type
 */
async function processEvent(event_type, data) {
  const handler = eventHandlers[event_type];
  
  if (!handler) {
    logger.warn(`No handler for event type: ${event_type}`);
    return false;
  }

  try {
    await handler(data);
    logger.info(`Event processed successfully: ${event_type}`);
    return true;
  } catch (error) {
    logger.error(`Error handling ${event_type}:`, error);
    throw error;
  }
}

// ============= PARTICIPANT HANDLERS =============

async function handleParticipantCreated(data) {
  const {
    id,
    firstName,
    lastName,
    email,
    phone,
    ageGroup,
    gender,
    school,
    city,
    state,
    zip,
  } = data;

  await query(
    `INSERT INTO participants 
     (webconnex_id, first_name, last_name, email, phone, age_group, gender, school, city, state, zip_code, last_sync)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (webconnex_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       age_group = EXCLUDED.age_group,
       gender = EXCLUDED.gender,
       school = EXCLUDED.school,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       zip_code = EXCLUDED.zip_code,
       last_sync = NOW(),
       updated_at = NOW()`,
    [id, firstName, lastName, email, phone, ageGroup, gender, school, city, state, zip]
  );
}

async function handleParticipantUpdated(data) {
  // Same as created - upsert
  await handleParticipantCreated(data);
}

// ============= REGISTRATION HANDLERS =============

async function handleRegistrationCreated(data) {
  const {
    id,
    participantId,
    eventName,
    eventDate,
    registrationDate,
    registrationType,
    feeAmount,
    feePaid,
    paymentMethod,
    notes,
  } = data;

  // First ensure participant exists
  const participantResult = await query(
    'SELECT id FROM participants WHERE webconnex_id = $1',
    [participantId]
  );

  if (participantResult.rows.length === 0) {
    logger.warn(`Participant not found: ${participantId}`);
    return;
  }

  const localParticipantId = participantResult.rows[0].id;

  await query(
    `INSERT INTO registrations
     (webconnex_id, participant_id, event_name, event_date, registration_date, status, registration_type, fee_amount, fee_paid, payment_method, notes)
     VALUES ($1, $2, $3, $4, $5, 'registered', $6, $7, $8, $9, $10)
     ON CONFLICT (webconnex_id) DO UPDATE SET
       event_name = EXCLUDED.event_name,
       event_date = EXCLUDED.event_date,
       registration_date = EXCLUDED.registration_date,
       registration_type = EXCLUDED.registration_type,
       fee_amount = EXCLUDED.fee_amount,
       fee_paid = EXCLUDED.fee_paid,
       payment_method = EXCLUDED.payment_method,
       notes = EXCLUDED.notes,
       updated_at = NOW()`,
    [id, localParticipantId, eventName, eventDate, registrationDate, registrationType, feeAmount, feePaid, paymentMethod, notes]
  );
}

async function handleRegistrationUpdated(data) {
  const { id, status } = data;

  await query(
    `UPDATE registrations 
     SET status = $1, updated_at = NOW()
     WHERE webconnex_id = $2`,
    [status || 'registered', id]
  );
}

// ============= ATTENDANCE HANDLERS =============

async function handleAttendanceCheckedIn(data) {
  const {
    id,
    participantId,
    registrationId,
    eventName,
    checkInTime,
  } = data;

  // Get participant ID
  const participantResult = await query(
    'SELECT id FROM participants WHERE webconnex_id = $1',
    [participantId]
  );

  if (participantResult.rows.length === 0) {
    logger.warn(`Participant not found: ${participantId}`);
    return;
  }

  const localParticipantId = participantResult.rows[0].id;

  // Get registration ID
  let localRegistrationId = null;
  if (registrationId) {
    const regResult = await query(
      'SELECT id FROM registrations WHERE webconnex_id = $1',
      [registrationId]
    );
    if (regResult.rows.length > 0) {
      localRegistrationId = regResult.rows[0].id;
    }
  }

  // Update registration status
  await query(
    `UPDATE registrations
     SET status = 'checked_in', updated_at = NOW()
     WHERE participant_id = $1 AND event_name = $2`,
    [localParticipantId, eventName]
  );

  // Insert or update attendance
  await query(
    `INSERT INTO attendance
     (webconnex_id, participant_id, registration_id, event_name, check_in_time, attendance_status)
     VALUES ($1, $2, $3, $4, $5, 'present')
     ON CONFLICT (webconnex_id) DO UPDATE SET
       check_in_time = EXCLUDED.check_in_time,
       updated_at = NOW()`,
    [id, localParticipantId, localRegistrationId, eventName, checkInTime]
  );
}

async function handleAttendanceCheckedOut(data) {
  const { id, checkOutTime, hoursAttended } = data;

  await query(
    `UPDATE attendance
     SET check_out_time = $1, hours_attended = $2, updated_at = NOW()
     WHERE webconnex_id = $3`,
    [checkOutTime, hoursAttended, id]
  );
}

module.exports = {
  processEvent,
};
