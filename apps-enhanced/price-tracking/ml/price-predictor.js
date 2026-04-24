/**
 * Price Prediction ML Service
 * Uses historical price data to predict future prices
 *
 * @module apps/price-tracking/ml/price-predictor
 * @version 2.0.0 (Enhanced)
 */

const { Firestore } = require('@google-cloud/firestore');

class PricePredictor {
  constructor(options = {}) {
    this.firestore = new Firestore({
      projectId: options.projectId || process.env.PROJECT_ID,
    });
    this.collection = 'price_predictions';
  }

  /**
   * Predict future prices for a product
   * @param {string} productId - Product identifier
   * @returns {Promise<object>} - Price predictions
   */
  async predictPrices(productId) {
    const history = await this._getPriceHistory(productId);

    if (!history || history.length < 3) {
      return {
        productId,
        error: 'Insufficient historical data',
        predictions: [],
      };
    }

    const predictions = this._generatePredictions(history);
    await this._savePredictions(productId, predictions);

    return {
      productId,
      predictions,
      confidence: this._calculateConfidence(history),
      recommendation: this._generateRecommendation(predictions),
    };
  }

  /**
   * Get price history for product
   * @private
   */
  async _getPriceHistory(productId) {
    const snapshot = await this.firestore
      .collection('products')
      .doc(productId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    const product = snapshot.data();
    return product.priceHistory || [];
  }

  /**
   * Generate price predictions using ML model
   * @private
   */
  _generatePredictions(history) {
    const prices = history.map(h => h.amount);
    const predictions = [];

    const trend = this._calculateTrend(prices);
    const seasonality = this._calculateSeasonality(history);

    const lastPrice = prices[prices.length - 1];

    for (let day = 1; day <= 7; day++) {
      const basePrediction = lastPrice + (trend * day);
      const seasonalAdjustment = seasonality[day % 7] || 0;

      const predictedPrice = basePrediction + seasonalAdjustment;
      const lowerBound = predictedPrice * 0.95;
      const upperBound = predictedPrice * 1.05;

      predictions.push({
        date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString(),
        predictedPrice: predictedPrice.toFixed(2),
        lowerBound: lowerBound.toFixed(2),
        upperBound: upperBound.toFixed(2),
        confidence: this._getConfidenceLevel(day, history.length),
      });
    }

    return predictions;
  }

  /**
   * Calculate trend using linear regression
   * @private
   */
  _calculateTrend(prices) {
    const n = prices.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += prices[i];
      sumXY += i * prices[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate seasonality patterns
   * @private
   */
  _calculateSeasonality(history) {
    const dayOfWeekAvg = [0, 0, 0, 0, 0, 0, 0];
    const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0];

    history.forEach(h => {
      const date = new Date(h.timestamp);
      const dayOfWeek = date.getDay();
      dayOfWeekAvg[dayOfWeek] += h.amount;
      dayOfWeekCount[dayOfWeek]++;
    });

    const overallAvg = history.reduce((sum, h) => sum + h.amount, 0) / history.length;

    return dayOfWeekAvg.map((sum, idx) => {
      const count = dayOfWeekCount[idx];
      return count > 0 ? (sum / count) - overallAvg : 0;
    });
  }

  /**
   * Calculate confidence level
   * @private
   */
  _getConfidenceLevel(daysAhead, dataPoints) {
    const dataConfidence = Math.min(dataPoints / 30, 1);
    const timeDecay = Math.max(0, 1 - (daysAhead / 14));

    return (dataConfidence * timeDecay).toFixed(2);
  }

  /**
   * Generate recommendation based on predictions
   * @private
   */
  _generateRecommendation(predictions) {
    if (!predictions || predictions.length === 0) {
      return 'hold';
    }

    const currentPrice = parseFloat(predictions[0].predictedPrice);
    const minPrice = Math.min(...predictions.map(p => parseFloat(p.lowerBound)));

    const priceDrop = (currentPrice - minPrice) / currentPrice;

    if (priceDrop > 0.10) {
      return 'buy';
    } else if (priceDrop < -0.05) {
      return 'wait';
    } else {
      return 'hold';
    }
  }

  /**
   * Save predictions to Firestore
   * @private
   */
  async _savePredictions(productId, predictions) {
    await this.firestore
      .collection(this.collection)
      .doc(productId)
      .set({
        productId,
        predictions,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
  }

  /**
   * Calculate overall confidence
   * @private
   */
  _calculateConfidence(history) {
    if (history.length < 3) return 0;
    if (history.length < 10) return 'low';
    if (history.length < 30) return 'medium';
    return 'high';
  }
}

module.exports = PricePredictor;
