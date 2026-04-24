/**
 * Demo Stories for Story Narrator Engine
 * Pre-configured story templates for testing and demonstration
 */

/**
 * Story templates
 */
const DEMO_STORIES = {
  dragon_quest: {
    theme: 'Epic Fantasy Adventure',
    genre: 'fantasy',
    setting: 'The mystical kingdom of Eldoria, where dragons once ruled the skies',
    characters: ['NARRATOR', 'HERO', 'WISE_OLD_MAN', 'VILLAIN'],
    plotOutline: `
      A young knight named Sir Aldric must journey to the Dragon's Peak to retrieve
      the Crystal of Light before the dark sorcerer Malachar can use it to plunge
      the kingdom into eternal darkness. Guided by the ancient wizard Eldrin, Aldric
      faces trials of courage, wisdom, and sacrifice.
    `,
    interactive: true,
    language: 'en'
  },

  space_exploration: {
    theme: 'Interstellar Discovery',
    genre: 'sci-fi',
    setting: 'Aboard the starship Horizon, exploring the edge of known space',
    characters: ['NARRATOR', 'HERO', 'SIDEKICK', 'VILLAIN'],
    plotOutline: `
      Captain Maya Chen and her AI companion ARIA discover a mysterious signal
      from beyond the galactic rim. When crew officer Ryker reveals his true
      allegiance to the ruthless mining corporation ExoTech, Maya must choose
      between scientific discovery and protecting the alien civilization they've found.
    `,
    interactive: true,
    language: 'en'
  },

  mystery_mansion: {
    theme: 'Victorian Mystery',
    genre: 'mystery',
    setting: 'Blackwood Manor, a fog-shrouded estate on the Yorkshire moors',
    characters: ['NARRATOR', 'HERO', 'SIDEKICK', 'WISE_OLD_MAN', 'VILLAIN'],
    plotOutline: `
      Detective inspector James Blackwood returns to his ancestral home to investigate
      his uncle's mysterious death. With his loyal assistant Sarah and the family
   butler who knows all secrets, James uncovers a web of deceit that spans generations.
    `,
    interactive: false,
    language: 'en'
  },

  jungle_expedition: {
    theme: 'Adventure in the Amazon',
    genre: 'adventure',
    setting: 'The deep Amazon rainforest, searching for lost civilizations',
    characters: ['NARRATOR', 'HERO', 'SIDEKICK', 'VILLAIN'],
    plotOutline: `
      Dr. Sofia Rodriguez and her enthusiastic student Leo embark on an expedition
      to find the legendary City of Gold. But rival treasure hunter Marcus Vance
      has other plans, and the jungle itself holds dangers beyond imagination.
    `,
    interactive: true,
    language: 'en'
  },

  cyberpunk_heist: {
    theme: 'Neon City Heist',
    genre: 'cyberpunk',
    setting: 'Neo Tokyo 2087, a city of holograms and corporate warfare',
    characters: ['NARRATOR', 'HERO', 'SIDEKICK', 'VILLAIN'],
    plotOutline: `
      Master hacker Zero and their street-smart partner Jinx plan the ultimate
      heist: stealing consciousness data from Yamato Corp. But corporate executive
      Sato has hired mercenaries to stop them at any cost.
    `,
    interactive: true,
    language: 'en'
  }
};

/**
 * Hindi stories (Indian languages)
 */
const HINDI_STORIES = {
  rajkumar_kahani: {
    theme: 'राजकुमार की रोमांचक यात्रा', // Prince's Adventure
    genre: 'fantasy',
    setting: 'प्राचीन भारत के राज्य में', // Ancient Indian kingdom
    characters: ['NARRATOR', 'HERO', 'WISE_OLD_MAN', 'VILLAIN'],
    plotOutline: `
      राजकुमार वीर को अपने राज्य को एक जादूगर से बचाना है।
      गुरु जी की मार्गदर्शन में, वीर कई परीक्षाओं का सामना करता है।
    `,
    interactive: true,
    language: 'hi'
  },

  akbar_birbal: {
    theme: 'अकबर बीरबल की कहानियाँ', // Akbar Birbal Stories
    genre: 'folklore',
    setting: 'मुगल साम्राज्य के दरबार में', // Mughal court
    characters: ['NARRATOR', 'HERO', 'SIDEKICK', 'WISE_OLD_MAN'],
    plotOutline: `
      बीरबल अपनी बुद्धि से सम्राट अकबर की मुश्किल समस्याओं को हल करते हैं।
    `,
    interactive: false,
    language: 'hi'
  }
};

/**
 * Bengali stories
 */
const BENGALI_STORIES = {
  thakumar_jhuli: {
    theme: 'ঠাকুমার ঝুলি', // Grandmother's Tales
    genre: 'folklore',
    setting: 'গ্রামবাংলার প্রেক্ষাপটে', // Rural Bengal
    characters: ['NARRATOR', 'HERO', 'WISE_OLD_MAN'],
    plotOutline: `
      এক ছোট ছেলে রাক্ষসের সাথে লড়াই করে তার গ্রামকে বাঁচায়।
    `,
    interactive: false,
    language: 'bn'
  }
};

/**
 * Get story by name
 */
function getStory(name, language = 'en') {
  const stories = language === 'hi' ? HINDI_STORIES :
                  language === 'bn' ? BENGALI_STORIES :
                  DEMO_STORIES;

  return stories[name] || Object.values(stories)[0];
}

/**
 * Get all available stories
 */
function getAllStories() {
  return {
    english: Object.keys(DEMO_STORIES),
    hindi: Object.keys(HINDI_STORIES),
    bengali: Object.keys(BENGALI_STORIES)
  };
}

/**
 * Get random story
 */
function getRandomStory(language = 'en') {
  const stories = language === 'hi' ? HINDI_STORIES :
                  language === 'bn' ? BENGALI_STORIES :
                  DEMO_STORIES;

  const keys = Object.keys(stories);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return stories[randomKey];
}

module.exports = {
  DEMO_STORIES,
  HINDI_STORIES,
  BENGALI_STORIES,
  getStory,
  getAllStories,
  getRandomStory
};
