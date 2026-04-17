/**
 * OmniClaw Agent Orchestrator
 * Routes requests to appropriate skills/services based on intent
 */

const ServiceMesh = require('./service_mesh');

class AgentOrchestrator {
  constructor() {
    this.serviceMesh = new ServiceMesh();
    this.skills = new Map();
    this.intentMap = new Map();
    this.persona = 'default';

    this.registerDefaultIntents();
    this.registerDefaultSkills();
  }

  registerDefaultIntents() {
    // Map intents to skills
    this.intentMap.set('WhatsAppIntent', 'whatsapp');
    this.intentMap.set('SendWhatsAppMessage', 'whatsapp');
    this.intentMap.set('TwitterIntent', 'twitter');
    this.intentMap.set('SpotifyIntent', 'spotify');
    this.intentMap.set('StoryIntent', 'story');
    this.intentMap.set('PriceIntent', 'price');
    this.intentMap.set('WeatherIntent', 'weather');
    this.intentMap.set('SearchIntent', 'search');
    this.intentMap.set('VaultIntent', 'search');  // Vault searches knowledge graph
  }

  registerDefaultSkills() {
    // Skills are registered via service mesh
    // Additional skill handlers can be added here
  }

  registerSkill(name, handler) {
    this.skills.set(name, handler);
    console.log(`[AgentOrchestrator] Registered skill: ${name}`);
  }

  registerIntent(intentName, skillName) {
    this.intentMap.set(intentName, skillName);
  }

  getSkillForIntent(intentName) {
    return this.intentMap.get(intentName) || 'default';
  }

  async route(intentName, params, context = {}) {
    const skillName = this.getSkillForIntent(intentName);

    // Check if skill is healthy before routing
    if (this.serviceMesh.isHealthy(skillName)) {
      return this.executeSkill(skillName, intentName, params, context);
    }

    // Try fallback chain
    const fallbackChain = this.serviceMesh.getFallbackChain(skillName);
    for (const fallback of fallbackChain) {
      if (this.serviceMesh.isHealthy(fallback)) {
        return this.executeSkill(fallback, intentName, params, context);
      }
    }

    // No healthy service found
    return {
      success: false,
      error: `Service ${skillName} is currently unavailable`,
      availableServices: this.serviceMesh.getAllServices().filter(s => s.health.healthy).map(s => s.name)
    };
  }

  async executeSkill(skillName, intentName, params, context) {
    const skill = this.skills.get(skillName);
    if (skill) {
      return skill.execute(intentName, params, context);
    }

    // Fall back to service mesh direct call
    const service = this.serviceMesh.getService(skillName);
    if (service) {
      return this.executeViaServiceMesh(skillName, intentName, params);
    }

    return { success: false, error: `Skill ${skillName} not found` };
  }

  async executeViaServiceMesh(serviceName, intentName, params) {
    const service = this.serviceMesh.getService(serviceName);
    if (!service) return { success: false, error: 'Service not found' };

    // Route to appropriate endpoint based on intent
    const endpoints = {
      'whatsapp': {
        'WhatsAppIntent': '/whatsapp/send',
        'SendWhatsAppMessage': '/whatsapp/send'
      }
    };

    const serviceEndpoints = endpoints[serviceName];
    const endpoint = serviceEndpoints?.[intentName];

    if (!endpoint) {
      return { success: false, error: `No endpoint for ${intentName} in ${serviceName}` };
    }

    try {
      const response = await fetch(`${service.config.endpoint}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        timeout: service.config.timeout
      });

      return await response.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  setPersona(persona) {
    this.persona = persona;
  }

  getPersona() {
    return this.persona;
  }

  getServiceMesh() {
    return this.serviceMesh;
  }

  getAllSkills() {
    return Array.from(this.skills.keys());
  }

  getIntentMap() {
    return Array.from(this.intentMap.entries()).map(([intent, skill]) => ({ intent, skill }));
  }
}

module.exports = AgentOrchestrator;
