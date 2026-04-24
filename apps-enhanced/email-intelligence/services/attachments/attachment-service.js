/**
 * Email Attachment Service
 * Handles email attachment processing, summarization, and voice description
 *
 * @module apps/email-intelligence/services/attachments/attachment-service
 * @version 2.0.0 (Enhanced)
 */

const { GoogleAuth } = require('google-auth-library');
const { gmail } = require('@googleapis/gmail');
const anthropic = require('@anthropic-ai/sdk');

class AttachmentService {
  constructor(options = {}) {
    this.projectId = options.projectId || process.env.PROJECT_ID;
  }

  /**
   * Process email attachments
   * @param {string} messageId - Gmail message ID
   * @param {string} accessToken - Gmail access token
   * @returns {Promise<object>} - Processed attachments
   */
  async processAttachments(messageId, accessToken) {
    const auth = new GoogleAuth();
    auth.setCredentials({ access_token: accessToken });

    const gmailClient = gmail({ version: 'v1', auth });

    // Get message with attachments
    const message = await gmailClient.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const attachments = [];

    // Parse attachments from message payload
    if (message.data.payload.parts) {
      for (const part of message.data.payload.parts) {
        if (part.filename && part.body && part.body.attachmentId) {
          const attachment = await this._processAttachment(
            gmailClient,
            messageId,
            part,
            accessToken
          );
          attachments.push(attachment);
        }

        // Handle nested parts (e.g., in multipart/mixed)
        if (part.parts) {
          for (const nestedPart of part.parts) {
            if (nestedPart.filename && nestedPart.body && nestedPart.body.attachmentId) {
              const attachment = await this._processAttachment(
                gmailClient,
                messageId,
                nestedPart,
                accessToken
              );
              attachments.push(attachment);
            }
          }
        }
      }
    }

    return {
      messageId,
      count: attachments.length,
      attachments,
    };
  }

  /**
   * Process individual attachment
   * @private
   */
  async _processAttachment(gmailClient, messageId, part, accessToken) {
    const { filename, mimeType, body } = part;

    // Download attachment data
    const attachmentData = await gmailClient.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: body.attachmentId,
    });

    const buffer = Buffer.from(attachmentData.data, 'base64');

    // Extract file info
    const fileInfo = {
      filename,
      mimeType,
      size: buffer.length,
      sizeFormatted: this._formatBytes(buffer.length),
    };

    // Summarize attachment based on type
    const summary = await this._summarizeAttachment(fileInfo, buffer);

    return {
      ...fileInfo,
      attachmentId: body.attachmentId,
      summary,
    };
  }

  /**
   * Summarize attachment based on type
   * @private
   */
  async _summarizeAttachment(fileInfo, buffer) {
    const { filename, mimeType, size } = fileInfo;

    let summary = {
      type: this._getAttachmentCategory(mimeType),
      description: '',
      voiceFriendly: '',
      actionItems: [],
    };

    // Image files
    if (mimeType.startsWith('image/')) {
      summary.description = `Image file: ${filename}`;
      summary.voiceFriendly = `Attachment includes an image called ${filename.replace(/\.[^/.]+$/, '')}`;
      summary.actionItems.push('View image to see content');
    }

    // PDF files
    else if (mimeType === 'application/pdf') {
      summary.description = `PDF document: ${filename} (${fileInfo.sizeFormatted})`;
      summary.voiceFriendly = `Attached PDF document with ${fileInfo.sizeFormatted} size`;
      summary.actionItems.push('Review PDF content');
    }

    // Documents (Word, Excel, PowerPoint)
    else if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('sheet') || mimeType.includes('presentation')) {
      summary.description = `Document: ${filename}`;
      summary.voiceFriendly = `Document attached: ${filename.replace(/\.[^/.]+$/, '')}`;
      summary.actionItems.push('Review document');
    }

    // Archives
    else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
      summary.description = `Archive file: ${filename} (${fileInfo.sizeFormatted})`;
      summary.voiceFriendly = `Archive file with ${fileInfo.sizeFormatted} compressed data`;
      summary.actionItems.push('Extract and review contents');
    }

    // Generic fallback
    else {
      summary.description = `File attachment: ${filename} (${mimeType})`;
      summary.voiceFriendly = `File attached: ${filename}`;
      summary.actionItems.push('Review attachment');
    }

    return summary;
  }

  /**
   * Get attachment category
   * @private
   */
  _getAttachmentCategory(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
    return 'other';
  }

  /**
   * Format bytes to human-readable size
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate voice description for attachments
   * @param {object} attachments - Processed attachments
   * @returns {string} - Voice-friendly description
   */
  generateVoiceDescription(attachments) {
    if (!attachments || attachments.length === 0) {
      return 'No attachments';
    }

    if (attachments.length === 1) {
      const a = attachments[0];
      return `One attachment: ${a.voiceFriendly}`;
    }

    const descriptions = attachments.map(a => a.voiceFriendly);
    return `${attachments.length} attachments: ${descriptions.join(', ')}`;
  }

  /**
   * Extract key information from attachment
   * @param {object} attachment - Attachment object
   * @returns {Promise<string>} - Key information
   */
  async extractKeyInfo(attachment) {
    // This would use OCR for images, PDF parsing, etc.
    // For now, return basic info
    return `Attachment: ${attachment.filename}, Size: ${attachment.sizeFormatted}`;
  }
}

module.exports = AttachmentService;
