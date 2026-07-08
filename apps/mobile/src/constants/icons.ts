export const Icons = {
  // Tab bar
  tabHome: "home",
  tabWork: "work",
  tabChat: "chat",
  tabPerson: "person",
  tabBrowse: "search",
  tabBids: "gavel",

  // Navigation
  back: "arrow-back",
  chevronRight: "chevron-right",
  close: "close",
  menu: "menu",

  // Actions
  add: "add",
  location: "room",
  camera: "photo-camera",
  edit: "edit",
  delete: "delete",
  share: "share",
  check: "check",
  // Urgency
  emergency: "flash-on",
  today: "schedule",
  scheduled: "calendar-today",

  // Credits / finance
  credit: "toll",

  // Roles
  handyman: "handyman",
  homeRepair: "home-repair-service",

  // Trust / verification
  verified: "verified",
  star: "star",
  thumbUp: "thumb-up",
  noShow: "cancel",

  // Empty states
  notifNone: "notifications_none",
  workOutline: "work-outline",
  history: "history",
  hourglass: "hourglass-empty",
  chatNone: "chat",
  searchOff: "search-off",
  assignment: "assignment",
  gavel: "gavel",

  // Media
  video: "videocam",
  play: "play-circle",
  image: "image",
  addPhoto: "add-photo-alternate",

  // Misc
  chevronDown: "expand-more",
  checkCircle: "check-circle",
  warning: "warning",
  info: "info",
  phone: "phone",
  notifs: "notifications",
  language: "language",
  help: "help",
  about: "info",
  logout: "logout",
  visibility: "visibility",
  visibilityOff: "visibility_off",
} as const;

export type IconName = (typeof Icons)[keyof typeof Icons];
