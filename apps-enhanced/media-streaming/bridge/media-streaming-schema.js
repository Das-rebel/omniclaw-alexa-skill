/**
 * GraphQL Schema for Media Streaming
 *
 * Provides a unified, type-safe API abstraction layer for:
 * - Spotify (music streaming)
 * - YouTube (video streaming)
 * - Fen/Kodi (media center)
 *
 * Features:
 * - Platform-agnostic query interface
 * - Standardized response format
 * - Type-safe operations
 * - Subscription support for real-time updates
 */

const { gql } = require('apollo-server-express');

// GraphQL Schema Definition
const typeDefs = gql`
  # Platform enum
  enum Platform {
    SPOTIFY
    YOUTUBE
    FEN
  }

  # Media type enum
  enum MediaType {
    MUSIC
    VIDEO
    MOVIE
    TV_SHOW
    PLAYLIST
    PODCAST
  }

  # Playback state
  enum PlaybackState {
    PLAYING
    PAUSED
    STOPPED
    BUFFERING
  }

  # Repeat mode
  enum RepeatMode {
    OFF
    TRACK
    CONTEXT
  }

  # Base media item interface
  interface MediaItem {
    id: String!
    title: String!
    type: MediaType!
  }

  # Spotify track
  type SpotifyTrack implements MediaItem {
    id: String!
    title: String!
    type: MediaType!
    artists: String!
    album: String!
    duration: String!
    uri: String!
    popularity: Int
  }

  # YouTube video
  type YouTubeVideo implements MediaItem {
    id: String!
    title: String!
    type: MediaType!
    channelTitle: String!
    description: String
    duration: String
    viewCount: Int
    thumbnail: String
    url: String!
    publishedAt: String
  }

  # Fen/Kodi media item
  type FenMediaItem implements MediaItem {
    id: String!
    title: String!
    type: MediaType!
    showTitle: String
    season: Int
    episode: Int
    year: Int
    genre: [String]
    plot: String
    thumbnail: String
    file: String
  }

  # Device
  type Device {
    id: String!
    name: String!
    type: String!
    isActive: Boolean!
    volume: Int
  }

  # Playback info
  type PlaybackInfo {
    state: PlaybackState!
    platform: Platform
    progressMs: Int
    durationMs: Int
    percentage: Float
    volume: Int
    shuffle: Boolean!
    repeat: RepeatMode!
    currentItem: MediaItem
    device: Device
  }

  # Search result
  type SearchResult {
    platform: Platform!
    query: String!
    totalResults: Int!
    items: [MediaItem!]!
  }

  # Playlist
  type Playlist {
    id: String!
    name: String!
    owner: String!
    description: String
    totalTracks: Int!
    thumbnail: String
    uri: String!
  }

  # Platform status
  type PlatformStatus {
    platform: Platform!
    available: Boolean!
    authenticated: Boolean
    active: Boolean
    error: String
  }

  # Volume result
  type VolumeResult {
    platform: Platform!
    volume: Int!
    success: Boolean!
    message: String
  }

  # Control result
  type ControlResult {
    platform: Platform!
    success: Boolean!
    message: String!
    state: PlaybackInfo
  }

  # Search response
  type SearchResponse {
    success: Boolean!
    results: [SearchResult!]!
    message: String
  }

  # Queries
  type Query {
    """
    Get current playback state across all platforms
    """
    getPlaybackState(platform: Platform): PlaybackInfo!

    """
    Search for content across platforms
    """
    searchMedia(
      query: String!
      platforms: [Platform]
      types: [MediaType]
      limit: Int
    ): SearchResponse!

    """
    Get available devices for a platform
    """
    getDevices(platform: Platform!): [Device!]!

    """
    Get user's playlists
    """
    getPlaylists(platform: Platform!, limit: Int): [Playlist!]!

    """
    Get playlist details
    """
    getPlaylist(id: String!, platform: Platform!): Playlist!

    """
    Get platform status
    """
    getPlatformStatus(platform: Platform!): PlatformStatus!

    """
    Get all platform statuses
    """
    getAllPlatformStatuses: [PlatformStatus!]!

    """
    Get recently played content
    """
    getRecentlyPlayed(platform: Platform!, limit: Int): [MediaItem!]!

    """
    Get recommendations
    """
    getRecommendations(
      platform: Platform!
      limit: Int
      seedArtists: [String]
      seedGenres: [String]
    ): [MediaItem!]!

    """
    Continue watching/playing last content
    """
    continueWatching: ControlResult!
  }

  # Mutations
  type Mutation {
    """
    Play content on specified platform
    """
    playContent(
      query: String!
      platform: Platform
      deviceId: String
      contextUri: String
    ): ControlResult!

    """
    Pause playback on active platform
    """
    pause(platform: Platform): ControlResult!

    """
    Resume playback on active platform
    """
    resume(platform: Platform): ControlResult!

    """
    Stop playback on active platform
    """
    stop(platform: Platform): ControlResult!

    """
    Skip to next track
    """
    next(platform: Platform): ControlResult!

    """
    Skip to previous track
    """
    previous(platform: Platform): ControlResult!

    """
    Seek to position
    """
    seek(
      positionMs: Int
      percentage: Float
      platform: Platform
    ): ControlResult!

    """
    Set volume
    """
    setVolume(
      volume: Int!
      platform: Platform
    ): VolumeResult!

    """
    Set shuffle mode
    """
    setShuffle(
      shuffle: Boolean!
      platform: Platform
    ): ControlResult!

    """
    Set repeat mode
    """
    setRepeat(
      mode: RepeatMode!
      platform: Platform
    ): ControlResult!

    """
    Set active device
    """
    setDevice(
      deviceId: String!
      platform: Platform!
    ): ControlResult!

    """
    Authorize Spotify
    """
    authorizeSpotify(code: String!): ControlResult!

    """
    Refresh Spotify token
    """
    refreshSpotifyToken: ControlResult!
  }

  # Subscriptions
  type Subscription {
    """
    Subscribe to playback state changes
    """
    playbackStateChanged(platform: Platform): PlaybackInfo!

    """
    Subscribe to track changes
    """
    trackChanged(platform: Platform): MediaItem!
  }
`;

module.exports = { typeDefs };
