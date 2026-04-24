/**
 * Calendar Integration Service
 * Extracts meeting requests from emails and integrates with Google Calendar
 *
 * @module apps/email-intelligence/services/calendar/calendar-service
 * @version 2.0.0 (Enhanced)
 */

const { GoogleAuth } = require('google-auth-library');
const { calendar } = require('@googleapis/calendar');
const Anthropic = require('@anthropic-ai/sdk');

class CalendarService {
  constructor(options = {}) {
    this.projectId = options.projectId || process.env.PROJECT_ID;
    this.anthropic = new Anthropic({
      apiKey: options.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Extract meeting request from email
   * @param {object} email - Email object
   * @returns {Promise<object>} - Meeting details
   */
  async extractMeetingRequest(email) {
    const { subject, body, sender, date } = email;

    const prompt = `Extract meeting details from this email:

Subject: ${subject}
From: ${sender.name} <${sender.email}>
Body: ${body}

Extract:
- Title (meeting subject)
- Date and time
- Duration (if specified)
- Location (if any)
- Attendees (email addresses)
- Description/agenda

Return as JSON.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const meetingData = JSON.parse(response.content[0].text);

    return {
      ...meetingData,
      sourceEmail: {
        subject,
        sender,
        date,
      },
    };
  }

  /**
   * Add meeting to Google Calendar
   * @param {object} meeting - Meeting details
   * @param {string} accessToken - Calendar access token
   * @returns {Promise<object>} - Created event
   */
  async addToCalendar(meeting, accessToken) {
    const auth = new GoogleAuth();
    auth.setCredentials({ access_token: accessToken });

    const calendarClient = calendar({ version: 'v3', auth });

    const event = {
      summary: meeting.title || meeting.subject || 'Meeting',
      location: meeting.location || '',
      description: meeting.description || meeting.agenda || '',
      start: this._parseDateTime(meeting.dateTime, meeting.duration || 60),
      end: this._parseDateTime(meeting.dateTime, meeting.duration || 60, true),
      attendees: meeting.attendees
        ? meeting.attendees.map(email => ({ email }))
        : [],
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendarClient.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      meeting,
    };
  }

  /**
   * Parse date/time string
   * @private
   */
  _parseDateTime(dateTimeStr, durationMinutes, isEndTime = false) {
    const date = new Date(dateTimeStr);

    if (isEndTime) {
      date.setMinutes(date.getMinutes() + durationMinutes);
    }

    return date.toISOString();
  }

  /**
   * Check for scheduling conflicts
   * @param {Date} startTime - Meeting start time
   * @param {Date} endTime - Meeting end time
   * @param {string} accessToken - Calendar access token
   * @returns {Promise<Array>} - Conflicting events
   */
  async checkConflicts(startTime, endTime, accessToken) {
    const auth = new GoogleAuth();
    auth.setCredentials({ access_token: accessToken });

    const calendarClient = calendar({ version: 'v3', auth });

    const response = await calendarClient.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
    });

    return response.data.items || [];
  }

  /**
   * Generate voice reminder for meeting
   * @param {object} meeting - Meeting details
   * @returns {string} - Voice-friendly reminder
   */
  generateVoiceReminder(meeting) {
    const { title, dateTime, location, duration } = meeting;
    const date = new Date(dateTime);

    const reminder = `Meeting reminder: ${title}`;
    const time = `on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    const details = location ? `at ${location}` : '';
    const dur = duration ? `for ${duration} minutes` : '';

    return `${reminder} ${time} ${details} ${dur}`.trim();
  }

  /**
   * Suggest meeting times based on availability
   * @param {number} durationMinutes - Meeting duration
   * @param {Array} preferredTimes - Preferred time slots
   * @param {string} accessToken - Calendar access token
   * @returns {Promise<Array>} - Suggested time slots
   */
  async suggestMeetingTimes(durationMinutes, preferredTimes = [], accessToken) {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const auth = new GoogleAuth();
    auth.setCredentials({ access_token: accessToken });

    const calendarClient = calendar({ version: 'v3', auth });

    const response = await calendarClient.freebusy.query({
      resource: {
        items: [{ id: 'primary' }],
      },
      timeMin: now.toISOString(),
      timeMax: weekFromNow.toISOString(),
    });

    const busyTimes = response.data.calendars.primary.busy || [];

    const availableSlots = [];
    let slotStart = new Date(now);

    for (let day = 0; day < 7; day++) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() + day);
      dayStart.setHours(9, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(17, 0, 0, 0);

      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

        const isAvailable = !this._overlapsWithBusyTimes(
          slotStart,
          slotEnd,
          busyTimes
        );

        if (isAvailable && slotEnd <= dayEnd) {
          availableSlots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
          });
        }

        slotStart = new Date(slotStart.getTime() + 60 * 60 * 1000);
      }
    }

    availableSlots.sort((a, b) => a.start - b.start);

    return availableSlots.slice(0, 5).map(slot => ({
      startTime: slot.start.toISOString(),
      endTime: slot.end.toISOString(),
      startTimeFriendly: slot.start.toLocaleString(),
      duration: durationMinutes,
    }));
  }

  /**
   * Check if time slot overlaps with busy times
   * @private
   */
  _overlapsWithBusyTimes(start, end, busyTimes) {
    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      if (start < busyEnd && end > busyStart) {
        return true;
      }
    }
    return false;
  }
}

module.exports = CalendarService;
